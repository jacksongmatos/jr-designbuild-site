import { useEffect, useRef } from 'react'

/**
 * LiquidCanvas
 * A lightweight WebGL fragment-shader background that renders a slow,
 * molten "liquid gold over black" field. Pointer movement gently warps
 * the flow. Degrades gracefully: if WebGL is unavailable the canvas
 * simply stays transparent and the dark hero background shows through.
 */

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// 2D hash + value noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.06;
  vec2 m = (u_mouse - 0.5) * 0.6;

  // domain-warped flow
  vec2 q = vec2(fbm(p + t + m), fbm(p - t * 0.7 - m));
  vec2 r = vec2(
    fbm(p + 1.8 * q + vec2(1.7, 9.2) + t * 0.5),
    fbm(p + 1.8 * q + vec2(8.3, 2.8) - t * 0.5)
  );
  float f = fbm(p + 2.2 * r);

  // gold palette over near-black
  vec3 ink = vec3(0.039, 0.039, 0.039);
  vec3 deep = vec3(0.078, 0.066, 0.035);
  vec3 gold = vec3(0.788, 0.659, 0.298);
  vec3 light = vec3(0.886, 0.784, 0.475);

  vec3 col = mix(ink, deep, smoothstep(0.0, 0.7, f));
  col = mix(col, gold, smoothstep(0.55, 0.95, f) * 0.7);
  col = mix(col, light, smoothstep(0.8, 1.0, f * f) * 0.5);

  // soft vignette so edges fall back into the page
  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
  col *= vig;

  gl_FragColor = vec4(col, 0.9);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function LiquidCanvas({
  className = '',
}: {
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const gl =
      (canvas.getContext('webgl', { alpha: true, antialias: true }) as
        | WebGLRenderingContext
        | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return

    const vert = compile(gl, gl.VERTEX_SHADER, VERT)
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vert || !frag) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const posLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'u_resolution')
    const uTime = gl.getUniformLocation(program, 'u_time')
    const uMouse = gl.getUniformLocation(program, 'u_mouse')

    const mouse = { x: 0.5, y: 0.5 }
    const target = { x: 0.5, y: 0.5 }

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      target.x = (e.clientX - rect.left) / rect.width
      target.y = 1 - (e.clientY - rect.top) / rect.height
    }
    window.addEventListener('pointermove', onPointer)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    const start = performance.now()
    const render = (now: number) => {
      mouse.x += (target.x - mouse.x) * 0.05
      mouse.y += (target.y - mouse.y) * 0.05
      const time = reduceMotion ? 0 : (now - start) / 1000
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, time)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      if (!reduceMotion) raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    if (reduceMotion) render(start) // single frame

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', resize)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      gl.deleteBuffer(buffer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      role="presentation"
    />
  )
}

import { useEffect, useRef, useState } from 'react'

/**
 * LiquidCanvas
 * A WebGL fragment shader that renders flowing "liquid metal" — molten gold
 * and copper drifting over near-black, with a slow moving specular sheen.
 * Pointer movement warps the flow. Degrades gracefully: if WebGL is
 * unavailable (or context creation fails) a CSS gold gradient shows instead.
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
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = rot * p * 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.09;
  vec2 m = (u_mouse - 0.5) * 0.7;

  // domain warping -> molten flow
  vec2 q = vec2(fbm(p + t + m), fbm(p - t * 0.6 - m + 5.2));
  vec2 r = vec2(
    fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.5),
    fbm(p + 2.0 * q + vec2(8.3, 2.8) - t * 0.45)
  );
  float f = fbm(p + 2.4 * r);

  // metallic palette: ink -> deep bronze -> copper -> gold -> bright sheen
  vec3 ink = vec3(0.035, 0.035, 0.038);
  vec3 bronze = vec3(0.16, 0.10, 0.04);
  vec3 copper = vec3(0.45, 0.26, 0.10);
  vec3 gold = vec3(0.79, 0.62, 0.27);
  vec3 sheen = vec3(0.98, 0.90, 0.66);

  vec3 col = mix(ink, bronze, smoothstep(0.10, 0.55, f));
  col = mix(col, copper, smoothstep(0.45, 0.72, f));
  col = mix(col, gold, smoothstep(0.62, 0.88, f));

  // moving specular highlight band (liquid-metal glint)
  float glint = smoothstep(0.86, 1.0, fbm(p * 1.4 + r + t * 1.3));
  col = mix(col, sheen, glint * 0.8);

  // veins of bright gold tracing the warp
  float vein = smoothstep(0.55, 0.5, abs(length(r - 0.5) - 0.35));
  col += gold * vein * 0.25;

  // vignette so edges settle back into the page
  float vig = smoothstep(1.3, 0.25, length(uv - 0.5));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
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
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const gl =
      (canvas.getContext('webgl', {
        alpha: false,
        antialias: true,
        premultipliedAlpha: false,
      }) as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)

    if (!gl) {
      setFailed(true)
      return
    }

    const vert = compile(gl, gl.VERTEX_SHADER, VERT)
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vert || !frag) {
      setFailed(true)
      return
    }

    const program = gl.createProgram()
    if (!program) {
      setFailed(true)
      return
    }
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFailed(true)
      return
    }
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
      const w = canvas.clientWidth || canvas.offsetWidth || window.innerWidth
      const h = canvas.clientHeight || canvas.offsetHeight || window.innerHeight
      const cw = Math.max(1, Math.floor(w * dpr))
      const ch = Math.max(1, Math.floor(h * dpr))
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    const start = performance.now()
    const render = (now: number) => {
      mouse.x += (target.x - mouse.x) * 0.045
      mouse.y += (target.y - mouse.y) * 0.045
      const time = reduceMotion ? 8 : (now - start) / 1000
      resize()
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, time)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      if (!reduceMotion) raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    if (reduceMotion) render(start)

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

  // CSS fallback (also the base layer behind the canvas while it boots)
  if (failed) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(120% 90% at 75% 25%, rgba(201,168,76,0.30), rgba(158,130,55,0.10) 45%, #0a0a0a 80%)',
        }}
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      role="presentation"
      style={{
        background:
          'radial-gradient(120% 90% at 75% 25%, rgba(201,168,76,0.18), #0a0a0a 70%)',
      }}
    />
  )
}

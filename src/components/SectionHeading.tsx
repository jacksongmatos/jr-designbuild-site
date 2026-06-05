import { Reveal } from './Reveal'

type Props = {
  eyebrow?: string
  title: string
  intro?: string
  center?: boolean
}

export function SectionHeading({ eyebrow, title, intro, center }: Props) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <Reveal>
          <span className="eyebrow">{eyebrow}</span>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2 className="h-display mt-4 text-4xl md:text-5xl">{title}</h2>
      </Reveal>
      {intro && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-base leading-relaxed text-muted">{intro}</p>
        </Reveal>
      )}
    </div>
  )
}

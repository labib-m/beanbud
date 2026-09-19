export function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <main className="screen">
      <h1 className="title">{title}<span className="dot">.</span></h1>
      <p className="muted spaced">{blurb}</p>
    </main>
  )
}

import { useState } from 'react'
import './Accordion.css'

type AccordionProps = {
  title: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}

export function Accordion({ title, count, defaultOpen = true, children }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="accordion" data-open={isOpen}>
      <button
        type="button"
        className="accordion-header"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="accordion-chevron">{isOpen ? '▼' : '▶'}</span>
        <span className="accordion-title">{title}</span>
        <span className="accordion-count">{count}</span>
      </button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  )
}

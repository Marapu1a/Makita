import { useState, useEffect, useRef, useMemo } from 'react'
import type { ModelDetail, Part, Slide } from '../lib/types'

interface Props {
  model: ModelDetail
}

function imgBase(categoryName: string, modelName: string) {
  return `/images/${encodeURIComponent(categoryName)}/${modelName}`
}

export default function Diagram({ model }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [svgMap, setSvgMap] = useState<Record<number, string | null>>({})
  const [hoveredPart, setHoveredPart] = useState<Part | null>(null)
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const svgContainerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const base = imgBase(model.category.name, model.name)
  const slides = model.slides
  const activeSlide: Slide | undefined = slides[activeIdx]
  const filteredParts = useMemo(
    () => (activeSlide ? activeSlide.parts : []),
    [activeSlide]
  )

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Load SVG overlay for SVG Type 1 slides
  useEffect(() => {
    if (!activeSlide?.hasSvg) return
    if (svgMap[activeSlide.id] !== undefined) return

    const svgPath = `${base}/${model.name}_${activeSlide.slideNumber}.svg`
    fetch(svgPath)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => setSvgMap((prev) => ({ ...prev, [activeSlide.id]: text })))
      .catch(() => setSvgMap((prev) => ({ ...prev, [activeSlide.id]: null })))
  }, [activeSlide, base, model.name, svgMap])

  // Inject SVG + bind hover events
  useEffect(() => {
    const slide = activeSlide
    if (!slide?.hasSvg || !svgContainerRef.current) return
    const svgText = svgMap[slide.id]
    if (!svgText) return

    const parser = new DOMParser()
    const doc = parser.parseFromString(svgText, 'image/svg+xml')
    const svgEl = doc.querySelector('svg')
    if (!svgEl) return

    svgContainerRef.current.innerHTML = ''
    svgContainerRef.current.appendChild(svgEl)

    const xlinkNS = 'http://www.w3.org/1999/xlink'
    svgEl.querySelectorAll<SVGUseElement>('use').forEach((useEl) => {
      useEl.style.overflow = 'visible'
      useEl.style.opacity = '1'
      useEl.style.fill = 'rgba(0,0,0,0)'
      useEl.setAttribute('pointer-events', 'all')

      const href = useEl.getAttributeNS(xlinkNS, 'href') || useEl.getAttribute('href') || ''
      const match = href.match(/#ref(\d+)/)
      if (!match) return

      const num = parseInt(match[1])
      const part = filteredParts.find((p) => p.number === num)
      if (!part) return

      useEl.addEventListener('mouseenter', () => {
        setHoveredPart(part)
        setHighlightedNumber(part.number)
      })
      useEl.addEventListener('mouseleave', () => {
        setHoveredPart(null)
        setHighlightedNumber(null)
      })
    })
  }, [svgMap, activeSlide, filteredParts])

  // Highlight SVG element from table hover
  useEffect(() => {
    if (!activeSlide?.hasSvg || !svgContainerRef.current) return
    const xlinkNS = 'http://www.w3.org/1999/xlink'
    svgContainerRef.current.querySelectorAll<SVGUseElement>('use').forEach((useEl) => {
      const href = useEl.getAttributeNS(xlinkNS, 'href') || useEl.getAttribute('href') || ''
      const match = href.match(/#ref(\d+)/)
      if (!match) return
      const num = parseInt(match[1])
      useEl.style.fill = num === highlightedNumber ? 'rgba(59,130,246,0.35)' : 'rgba(0,0,0,0)'
    })
  }, [highlightedNumber, activeSlide])

  // Tooltip follow mouse
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tooltipRef.current || !hoveredPart) return
    let x = e.clientX + 12
    let y = e.clientY - 44
    const w = tooltipRef.current.offsetWidth
    if (x + w > window.innerWidth) x = e.clientX - w - 12
    if (y < 0) y = e.clientY + 20
    tooltipRef.current.style.left = `${x}px`
    tooltipRef.current.style.top  = `${y}px`
  }

  const iw = activeSlide?.imageWidth  || 1
  const ih = activeSlide?.imageHeight || 1

  const DiagramArea = ({ slide }: { slide: Slide }) => (
    <div
      className="relative"
      style={{ aspectRatio: `${slide.imageWidth || 800}/${slide.imageHeight || 600}` }}
    >
      <img
        src={`${base}/${slide.imagePath}`}
        alt={`Схема ${model.name} слайд ${slide.slideNumber}`}
        className="w-full h-full object-contain"
        loading="lazy"
      />

      {/* SVG Type 1 overlay */}
      {slide.hasSvg && (
        <div
          ref={svgContainerRef}
          className="absolute inset-0 w-full h-full"
        />
      )}

      {/* DIV hotspots */}
      {!slide.hasSvg && slide.parts.map((part) => (
        <div
          key={part.id}
          className="absolute cursor-pointer"
          style={{
            left:   `${(part.xCoord! / iw) * 100}%`,
            top:    `${(part.yCoord! / ih) * 100}%`,
            width:  `${(part.width!  / iw) * 100}%`,
            height: `${(part.height! / ih) * 100}%`,
            background: part.number === highlightedNumber ? 'rgba(59,130,246,0.35)' : 'rgba(239,68,68,0)',
            zIndex: Math.max(1, 1000 - (part.width || 0) * (part.height || 0)),
            minWidth:  (part.width  && part.width  < 10) ? 12 : undefined,
            minHeight: (part.height && part.height < 10) ? 12 : undefined,
          }}
          onMouseEnter={() => { setHoveredPart(part); setHighlightedNumber(part.number) }}
          onMouseLeave={() => { setHoveredPart(null);  setHighlightedNumber(null) }}
        />
      ))}
    </div>
  )

  return (
    <div onMouseMove={handleMouseMove}>
      {/* Slide thumbnails */}
      {slides.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => setActiveIdx(i)}
              className={`border-2 rounded overflow-hidden w-16 h-16 ${
                i === activeIdx ? 'border-blue-500' : 'border-gray-300'
              }`}
            >
              <img
                src={`${base}/${slide.imagePath}`}
                alt={`Слайд ${slide.slideNumber}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Diagram — desktop */}
        {!isMobile && activeSlide && (
          <div className="md:w-3/5">
            <DiagramArea slide={activeSlide} />
          </div>
        )}

        {/* Mobile: "View diagram" button */}
        {isMobile && (
          <button
            onClick={() => setShowModal(true)}
            className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg"
          >
            Показать схему
          </button>
        )}

        {/* Parts table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-3 py-2 font-medium w-10">№</th>
                <th className="px-3 py-2 font-medium">Артикул</th>
                <th className="px-3 py-2 font-medium">Название</th>
                <th className="px-3 py-2 font-medium text-right">Цена</th>
                <th className="px-3 py-2 font-medium text-center">Наличие</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map((part) => (
                <tr
                  key={part.id}
                  className={`border-t cursor-pointer transition-colors ${
                    part.number === highlightedNumber
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => { setHoveredPart(part); setHighlightedNumber(part.number) }}
                  onMouseLeave={() => { setHoveredPart(null);  setHighlightedNumber(null) }}
                >
                  <td className="px-3 py-2 text-gray-500">{part.number}</td>
                  <td className="px-3 py-2 font-mono text-xs">{part.partNumber}</td>
                  <td className="px-3 py-2">{part.name || '—'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {part.price > 0 ? `${part.price.toLocaleString('ru')} ₽` : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${part.availability ? 'bg-green-500' : 'bg-red-400'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile modal */}
      {isMobile && showModal && activeSlide && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
            <h3 className="font-semibold">Схема {model.name}</h3>
            <button onClick={() => setShowModal(false)} className="text-xl leading-none">✕</button>
          </div>
          <div className="p-4">
            <DiagramArea slide={activeSlide} />
            {slides.length > 1 && (
              <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    onClick={() => setActiveIdx(i)}
                    className={`border-2 rounded shrink-0 w-20 h-20 ${i === activeIdx ? 'border-blue-500' : 'border-gray-300'}`}
                  >
                    <img src={`${base}/${slide.imagePath}`} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating tooltip */}
      {hoveredPart && (
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none z-[9999] bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg max-w-xs"
        >
          <div className="font-semibold mb-1">Позиция {hoveredPart.number}</div>
          <div>Артикул: <span className="font-mono">{hoveredPart.partNumber}</span></div>
          {hoveredPart.name && <div>{hoveredPart.name}</div>}
          {hoveredPart.price > 0 && <div>{hoveredPart.price.toLocaleString('ru')} ₽</div>}
        </div>
      )}
    </div>
  )
}

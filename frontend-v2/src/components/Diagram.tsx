import { useState, useEffect, useRef, useMemo } from 'react'
import CartModal from './CartModal'

interface Slide {
  id: number
  slideNumber: number
  imagePath: string
  imageWidth: number | null
  imageHeight: number | null
  hasSvg: boolean
}

interface Part {
  id: number       // id вхождения на схему — уникальный ключ строки
  partId: number   // id физической детали — для корзины
  slideId: number | null
  number: number
  partNumber: string
  name: string | null
  price: number
  availability: boolean
  quantity: number
  slug: string | null
  xCoord: number | null
  yCoord: number | null
  width: number | null
  height: number | null
}

interface ModelData {
  name: string
  category: { name: string }
  slides: Slide[]
  parts: Part[]
}

interface Props {
  model: ModelData
}

export default function Diagram({ model }: Props) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [svgContent, setSvgContent] = useState<Record<number, string | null>>({})
  const [hoveredPart, setHoveredPart] = useState<Part | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)

  const svgContainerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const slides = model.slides
  const parts  = model.parts
  const activeSlide = slides[activeSlideIndex]

  const imgBase = `/images/${encodeURIComponent(model.category.name)}/${model.name}`

  // Compute isSVG per slide — same as old: true if ANY part has null x_coord or y_coord
  const isSVGMap = useMemo(() => {
    const map: Record<number, boolean> = {}
    slides.forEach((slide) => {
      const slideParts = parts.filter((p) => p.slideId === slide.id)
      map[slide.id] = slideParts.some((p) => p.xCoord === null || p.yCoord === null)
    })
    return map
  }, [slides, parts])

  const isSVG = isSVGMap[activeSlide?.id] ?? false

  const filteredParts = useMemo(
    () => parts.filter((p) => p.slideId === activeSlide?.id),
    [parts, activeSlide]
  )

  const imageWidth  = activeSlide?.imageWidth  || 1
  const imageHeight = activeSlide?.imageHeight || 1

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Load SVG overlay for SVG-mode slides
  useEffect(() => {
    if (!activeSlide || !isSVG) return
    if (svgContent[activeSlide.id] !== undefined) return

    const path = `${imgBase}/${model.name}_${activeSlide.slideNumber}.svg`
    fetch(path)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => setSvgContent((prev) => ({ ...prev, [activeSlide.id]: text })))
      .catch(() => setSvgContent((prev) => ({ ...prev, [activeSlide.id]: null })))
  }, [activeSlideIndex, activeSlide, isSVG, imgBase, model.name, svgContent])

  // Inject SVG + bind hover events (exactly as old code)
  useEffect(() => {
    if (!activeSlide || !svgContainerRef.current) return
    const svgText = svgContent[activeSlide.id]
    if (!svgText) return

    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
    const svgEl = svgDoc.querySelector('svg')
    if (!svgEl) return

    svgContainerRef.current.innerHTML = ''
    svgContainerRef.current.appendChild(svgEl)

    const xlinkNS = 'http://www.w3.org/1999/xlink'
    svgEl.querySelectorAll<SVGUseElement>('use').forEach((useEl) => {
      useEl.setAttribute('style', 'overflow: visible; opacity: 1; fill: rgba(0, 0, 0, 0)')

      const href = useEl.getAttributeNS(xlinkNS, 'href') || useEl.getAttribute('href') || ''
      const match = href.match(/#ref(\d+)/)
      if (!match) return

      const num = parseInt(match[1])
      const part = parts.find((p) => p.number === num)
      if (!part) return

      useEl.setAttribute('pointer-events', 'all')
      useEl.addEventListener('mouseenter', () => handleMouseEnter(part))
      useEl.addEventListener('mouseleave', handleMouseLeave)
    })
  }, [svgContent, activeSlide])

  // Highlight SVG or DIV when hoveredPart changes (via table hover or diagram hover)
  useEffect(() => {
    if (!hoveredPart) {
      // Clear all highlights
      if (isSVG && svgContainerRef.current) {
        svgContainerRef.current.querySelectorAll<SVGUseElement>('use').forEach((el) => {
          el.setAttribute('style', 'overflow: visible; opacity: 1; fill: rgba(0, 0, 0, 0)')
        })
      } else {
        parts.forEach((p) => {
          const el = document.getElementById(`part-${p.id}`)
          if (el) el.style.backgroundColor = 'rgba(0,0,0,0)'
        })
      }
      return
    }

    const isMatch = (p: Part) => hoveredPart.partNumber === p.partNumber

    if (isSVG && svgContainerRef.current) {
      const xlinkNS = 'http://www.w3.org/1999/xlink'
      const svgEl = svgContainerRef.current.querySelector('svg')
      if (!svgEl) return
      svgEl.querySelectorAll<SVGUseElement>('use').forEach((useEl) => {
        const href = useEl.getAttributeNS(xlinkNS, 'href') || useEl.getAttribute('href') || ''
        const match = href.match(/#ref(\d+)/)
        if (!match) return
        const num = parseInt(match[1])
        const matched = parts.find((p) => isMatch(p) && p.number === num)
        useEl.setAttribute(
          'style',
          `overflow: visible; opacity: 1; fill: ${
            matched
              ? matched.availability ? 'rgba(0,255,0,0.7)' : 'rgba(255,0,0,0.7)'
              : 'rgba(0,0,0,0)'
          }`
        )
      })
    } else {
      parts.forEach((p) => {
        const el = document.getElementById(`part-${p.id}`)
        if (!el) return
        el.style.backgroundColor = isMatch(p)
          ? p.availability ? 'rgba(0,255,0,0.7)' : 'rgba(255,0,0,0.7)'
          : 'rgba(0,0,0,0)'
      })
    }
  }, [hoveredPart, isSVG, parts])

  const handleMouseEnter = (part: Part) => setHoveredPart(part)
  const handleMouseLeave = () => setHoveredPart(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tooltipRef.current || !hoveredPart) return
    let x = e.clientX + 10
    let y = e.clientY - 40
    const w = tooltipRef.current.offsetWidth
    if (x + w > window.innerWidth) x = e.clientX - w - 10
    if (y < 0) y = e.clientY + 20
    tooltipRef.current.style.left = `${x}px`
    tooltipRef.current.style.top  = `${y}px`
  }

  const DiagramImage = ({ slide }: { slide: Slide }) => (
    <div
      className="relative mx-auto"
      style={{
        aspectRatio: `${slide.imageWidth || 800}/${slide.imageHeight || 600}`,
        // Нормализуем размер: слайд вписывается и по ширине колонки, и по высоте экрана
        width: '100%',
        maxWidth: `min(100%, calc(82vh * ${(slide.imageWidth || 800) / (slide.imageHeight || 600)}))`,
      }}
    >
      <img
        src={`${imgBase}/${slide.imagePath}`}
        alt={`Схема ${model.name} слайд ${slide.slideNumber}`}
        className="w-full h-full object-contain"
        loading="lazy"
      />

      {/* SVG Type 1 overlay */}
      {isSVGMap[slide.id] && (
        <div ref={svgContainerRef} className="absolute inset-0 w-full h-full" />
      )}

      {/* DIV hotspots */}
      {!isSVGMap[slide.id] && (
        <div className="absolute inset-0 w-full h-full">
          {parts
            .filter((p) => p.slideId === slide.id)
            .map((part) => (
              <div
                key={part.id}
                id={`part-${part.id}`}
                className="absolute bg-red-500 cursor-pointer"
                style={{
                  backgroundColor: 'rgba(0,0,0,0)',
                  left:   `${((part.xCoord ?? 0) / imageWidth)  * 100}%`,
                  top:    `${((part.yCoord ?? 0) / imageHeight) * 100}%`,
                  width:  `${((part.width  ?? 0) / imageWidth)  * 100}%`,
                  height: `${((part.height ?? 0) / imageHeight) * 100}%`,
                  zIndex: Math.max(1, 1000 - (part.width ?? 0) * (part.height ?? 0)),
                  minWidth:  (part.width  && part.width  < 10) ? '12px' : undefined,
                  minHeight: (part.height && part.height < 10) ? '12px' : undefined,
                }}
                onMouseEnter={() => handleMouseEnter(part)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
        </div>
      )}
    </div>
  )

  return (
    <div onMouseMove={handleMouseMove}>
      {/* Slide thumbnails */}
      {slides.length > 1 && (
        <div className="flex-wrap gap-2 mb-4 hidden md:flex">
          {slides.map((slide, i) => (
            <img
              key={slide.id}
              src={`${imgBase}/${slide.imagePath}`}
              alt={`Слайд ${slide.slideNumber}`}
              className={`cursor-pointer w-16 h-16 object-contain border-2 ${
                i === activeSlideIndex ? 'border-blue-500' : 'border-gray-300'
              }`}
              onClick={() => setActiveSlideIndex(i)}
              loading="lazy"
            />
          ))}
        </div>
      )}

      <div className="py-4 flex gap-4 items-start">
        {/* Diagram — desktop */}
        {!isMobile && activeSlide && (
          <div className="flex-1 min-w-0">
            <DiagramImage slide={activeSlide} />
          </div>
        )}

        {/* Mobile: show diagram button */}
        {isMobile && (
          <button
            onClick={() => setShowModal(true)}
            className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg"
          >
            Показать схему
          </button>
        )}

        {/* Parts table — ширина по содержимому, вертикальный скролл в пределах экрана */}
        <div className="shrink-0 max-w-full md:max-w-[45%] overflow-auto max-h-[82vh]">
          <div className="overflow-x-auto border rounded">
            <table className="table-auto border-collapse border text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-2 py-1">#</th>
                  <th className="border px-3 py-1">Артикул</th>
                  <th className="border px-2 py-1">Название</th>
                  <th className="border px-2 py-1 text-center">Цена</th>
                  <th className="border px-2 py-1 text-center">Есть</th>
                  <th className="border px-2 py-1 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {[...filteredParts]
                  .sort((a, b) => a.number - b.number)
                  .map((part) => (
                    <tr
                      key={part.id}
                      className="hover:bg-yellow-100 cursor-pointer odd:bg-gray-50"
                      onMouseEnter={() => handleMouseEnter(part)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <td className="border px-2 py-1 text-center">{part.number}</td>
                      <td className="border px-2 py-1">
                        {part.slug ? (
                          <a href={`/parts/${part.slug}`} className="text-blue-700 hover:underline">
                            {part.partNumber}
                          </a>
                        ) : (
                          part.partNumber
                        )}
                      </td>
                      <td className="border px-2 py-1">{part.name || '—'}</td>
                      <td className="border px-2 py-1 text-center">
                        {part.price > 0 ? `${Math.ceil(part.price)} ₽` : '—'}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {part.availability ? 'Да' : 'Нет'}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        <button
                          className={`px-2 py-1 rounded text-white leading-none ${
                            part.availability
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-400 cursor-not-allowed'
                          }`}
                          onClick={() => part.availability && setSelectedPart(part)}
                          disabled={!part.availability}
                          title="Добавить в корзину"
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
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
            <DiagramImage slide={activeSlide} />
            {slides.length > 1 && (
              <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
                {slides.map((slide, i) => (
                  <img
                    key={slide.id}
                    src={`${imgBase}/${slide.imagePath}`}
                    alt=""
                    className={`border-2 rounded shrink-0 w-20 h-20 object-contain cursor-pointer ${
                      i === activeSlideIndex ? 'border-blue-500' : 'border-gray-300'
                    }`}
                    onClick={() => { setActiveSlideIndex(i); }}
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add to cart modal */}
      {selectedPart && (
        <CartModal
          part={{
            id: selectedPart.partId,
            part_number: selectedPart.partNumber,
            name: selectedPart.name ?? 'Без названия',
            price: selectedPart.price,
          }}
          onClose={() => setSelectedPart(null)}
        />
      )}

      {/* Tooltip */}
      {hoveredPart && (
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none z-[9999] bg-black text-white text-xs rounded px-3 py-2 shadow-lg"
        >
          <p><strong>Номер на схеме:</strong> {hoveredPart.number}</p>
          <p><strong>Артикул:</strong> {hoveredPart.partNumber}</p>
          {hoveredPart.name && <p><strong>Название:</strong> {hoveredPart.name}</p>}
          <p><strong>Цена:</strong> {hoveredPart.price} руб.</p>
        </div>
      )}
    </div>
  )
}

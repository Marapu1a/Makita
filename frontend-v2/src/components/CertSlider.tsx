import { useState } from 'react'

const certificates = Array.from({ length: 8 }, (_, i) => `/images/sertificates/${i + 1}.webp`)

export default function CertSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % certificates.length)
  const prevSlide = () =>
    setCurrentIndex((prev) => (prev - 1 + certificates.length) % certificates.length)

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-[250px] h-[350px] border rounded overflow-hidden cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <img
          src={certificates[currentIndex]}
          alt={`Сертификат ${currentIndex + 1}`}
          className="w-full h-full object-contain bg-white"
        />
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={prevSlide} className="p-2 border rounded">&lt;</button>
        <button onClick={nextSlide} className="p-2 border rounded">&gt;</button>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/80 z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative p-4 bg-white rounded-lg max-w-3xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 text-2xl"
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>
            <img
              src={certificates[currentIndex]}
              alt={`Сертификат ${currentIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

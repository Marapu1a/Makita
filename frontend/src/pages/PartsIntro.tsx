import { useState } from "react";

const PartsIntro: React.FC = () => {
  const certificates = Array.from(
    { length: 7 },
    (_, i) => `/images/sertificates/${i + 1}.webp`
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const nextSlide = () =>
    setCurrentIndex((prev) => (prev + 1) % certificates.length);
  const prevSlide = () =>
    setCurrentIndex(
      (prev) => (prev - 1 + certificates.length) % certificates.length
    );
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="flex container mx-auto pt-6 items-start gap-8">
      {/* Левая часть */}
      <div className="w-2/3">
        <h1 className="text-3xl font-bold mb-4">
          Запчасти для инструментов Makita
        </h1>
        <p className="text-gray-700 mb-4">
          Мы предлагаем широкий ассортимент оригинальных запчастей для
          электроинструментов <strong>Makita</strong>. Все детали соответствуют
          высоким стандартам качества и обеспечивают надежную работу вашего
          оборудования.
        </p>
        <p className="text-gray-700 mb-4">
          Наша компания является официальным дилером ведущих производителей
          запчастей и инструмента. Мы гарантируем подлинность продукции и
          предоставляем всю необходимую документацию.
        </p>
        <p className="text-gray-700">
          Вы можете быть уверены в надежности и долговечности наших запчастей –
          мы работаем только с проверенными поставщиками.
        </p>
        <h2 className="text-xl font-semibold mt-6">📜 Сертификаты</h2>
        <p className="text-gray-700">
          Наша продукция сертифицирована, что подтверждает её качество и
          соответствие стандартам.
        </p>
      </div>

      {/* Правая часть - слайдер сертификатов */}
      <div className="w-1/3 flex flex-col items-center">
        <h3 className="text-gray-700 text-center mb-2">
          Компания ООО "Снабтулс" является <br />
          официальным дилером торговой марки Makita:
        </h3>
        <div
          className="relative w-[250px] h-[350px] border rounded overflow-hidden cursor-pointer"
          onClick={openModal}
        >
          <img
            src={certificates[currentIndex]}
            alt={`Сертификат ${currentIndex + 1}`}
            className="w-full h-full object-contain bg-white"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={prevSlide} className="p-2 border rounded">
            &lt;
          </button>
          <button onClick={nextSlide} className="p-2 border rounded">
            &gt;
          </button>
        </div>
      </div>

      {/* Модальное окно */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/80 z-50"
          onClick={closeModal}
        >
          <div
            className="relative p-4 bg-white rounded-lg max-w-3xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 text-2xl"
              onClick={closeModal}
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
  );
};

export default PartsIntro;

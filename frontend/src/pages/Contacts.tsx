import { Dialog, DialogPanel, Transition } from "@headlessui/react";
import { Fragment, useMemo, useState } from "react";
import { Phone, Mail, Landmark, Printer, Expand, X } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

const OFFICE_COORDS: LatLngExpression = [55.8078, 37.7224];
const OFFICE_PHOTO_SRC = "/images/office.webp"; // public/images/office.webp

const Contacts = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  // стабильный icon для Vite (без 404 в prod)
  const markerIcon = useMemo(
    () =>
      L.icon({
        iconRetinaUrl: new URL(
          "leaflet/dist/images/marker-icon-2x.png",
          import.meta.url
        ).toString(),
        iconUrl: new URL(
          "leaflet/dist/images/marker-icon.png",
          import.meta.url
        ).toString(),
        shadowUrl: new URL(
          "leaflet/dist/images/marker-shadow.png",
          import.meta.url
        ).toString(),
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    []
  );

  return (
    <div className="container mx-auto pt-6 px-4">
      <h1 className="text-2xl font-bold mb-4">Контакты</h1>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Левая колонка */}
        <div className="w-full lg:w-1/2 print-page-1">
          <a
            href="https://zachestnyibiznes.ru/company/ul/1197746057156_9718126221_OOO-SNABTULS?w=1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline mb-2 inline-block"
          >
            ЗА ЧЕСТНЫЙ БИЗНЕС
          </a>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md transition mb-4 print:hidden"
          >
            <Printer />
            <span>Распечатать</span>
          </button>

          <section className="mb-6">
            <h2 className="text-lg font-semibold">
              ООО "Снабтулс" (Юр. лица с НДС 20%)
            </h2>
            <p className="flex items-center mt-2">
              <Landmark className="text-red-500 mr-2" />
              107150, Москва, ул. Бойцовая, 27 стр. 3
            </p>
            <p className="flex items-center">
              <Phone className="text-green-500 mr-2" />
              +7 (495) 215-02-99
            </p>
            <p className="text-gray-700">
              Прием звонков: 9:00-18:00 (Пн-Пт), 9:00-15:00 (Сб)
            </p>
            <p className="flex items-center">
              <Mail className="text-blue-500 mr-2" />
              <a href="mailto:makita-snab@mail.ru" className="underline">
                makita-snab@mail.ru
              </a>
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold">
              ИП Кутузов Александр Юрьевич (Физ. лица без НДС)
            </h2>
            <p className="flex items-center mt-2">
              <Landmark className="text-red-500 mr-2" />
              107150, Москва, ул. Бойцовая, 27 стр. 3
            </p>
            <p className="flex items-center">
              <Phone className="text-green-500 mr-2" />
              +7 (495) 215-02-99
            </p>
            <p className="text-gray-700">
              Прием звонков: 9:00-18:00 (Пн-Пт), 9:00-15:00 (Сб)
            </p>
            <p className="flex items-center">
              <Mail className="text-blue-500 mr-2" />
              <a href="mailto:makita-snab@mail.ru" className="underline">
                makita-snab@mail.ru
              </a>
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold">Реквизиты:</h3>
            <ul className="text-gray-700 space-y-1 mt-2">
              <li>Юр. адрес: Москва, ул. Бойцовая, 27, офис 228</li>
              <li>Факт. адрес: Москва, ул. Бойцовая, 27, стр. 3</li>
              <li>ИНН: 9718126221</li>
              <li>КПП: 771801001</li>
              <li>ОГРН: 1197746057156</li>
              <li>ОКПО: 35821414</li>
              <li>Расчётный счёт: 40702810138000151954</li>
              <li>БИК: 044525225</li>
              <li>Банк: ПАО СБЕРБАНК</li>
            </ul>
          </section>
        </div>

        {/* Правая колонка */}
        <div className="w-full lg:w-1/2 print-page-2 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Расположение на карте
            </h3>
            <MapContainer
              center={OFFICE_COORDS}
              zoom={16}
              style={{
                height: "300px",
                width: "100%",
                borderRadius: "8px",
              }}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={OFFICE_COORDS} icon={markerIcon}>
                <Popup>
                  Офис ООО "Снабтулс"
                  <br />
                  Москва, ул. Бойцовая, д.27 стр.3
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Фотография офиса</h3>
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md transition"
            >
              <Expand />
              <span>Открыть фото</span>
            </button>
          </div>

          <section>
            <h3 className="text-lg font-semibold">Схема проезда:</h3>
            <ul className="text-gray-700 list-disc pl-5 space-y-1">
              <li>Заезд под шлагбаум бесплатно (для авто);</li>
              <li>
                Выход из первого вагона из центра, по переходу налево и по
                ступенькам направо;
              </li>
              <li>Далее 440 метров по прямой до светофора;</li>
              <li>
                Переходите через пешеходный переход и поворачиваете налево;
              </li>
              <li>
                Далее 180 метров по прямой и справа от Вас будет здание Бойцовая
                дом 27 стр.23;
              </li>
              <li>
                Проход свободный, если Вы на автомобиле — то 30 минут парковка
                бесплатно;
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* Modal with office photo */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[1000]"
          onClose={() => setIsOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white p-3 shadow-xl">
                  <div className="flex items-center justify-end mb-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 transition"
                      aria-label="Закрыть"
                    >
                      <X size={18} />
                      Закрыть
                    </button>
                  </div>

                  <img
                    src={OFFICE_PHOTO_SRC}
                    alt="Фотография офиса"
                    className="w-full h-auto rounded-xl"
                    loading="lazy"
                    onError={() => {
                      // eslint-disable-next-line no-console
                      console.error(
                        "Office photo failed to load:",
                        OFFICE_PHOTO_SRC
                      );
                    }}
                  />
                </DialogPanel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default Contacts;

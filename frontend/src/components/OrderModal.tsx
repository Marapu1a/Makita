import { useState, useCallback } from "react";
import validator from "validator";
import InputMask from "react-input-mask";

const TRANSPORT_COMPANIES = [
  "СДЭК",
  "Почта России",
  "DPD",
  "Boxberry",
  "ПЭК",
  "Деловые Линии",
];

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: any) => Promise<{ success: boolean; message?: string }>;
  totalPrice: number;
  cartItems: any[];
}

const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  totalPrice,
  cartItems,
}) => {
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    phone: "",
    email: "",
    delivery_method: "Самовывоз",
    transport_company: "",
    city: "",
    street: "",
    house: "",
    apartment: "",
    comment: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const validateForm = () => {
    const {
      lastName,
      firstName,
      phone,
      email,
      delivery_method,
      city,
      street,
      house,
      transport_company,
    } = formData;
    if (
      !lastName.trim() ||
      !firstName.trim() ||
      !phone.trim() ||
      !email.trim()
    ) {
      setErrorMessage("Заполните все обязательные поля!");
      setIsLoading(false);
      return false;
    }
    if (phone.replace(/\D/g, "").length !== 11) {
      setErrorMessage("Некорректный формат телефона!");
      setIsLoading(false);
      return false;
    }
    if (!validator.isEmail(email)) {
      setErrorMessage("Некорректный формат email!");
      setIsLoading(false);
      return false;
    }
    if (delivery_method === "Отправка в регион" && !transport_company) {
      setErrorMessage("Выберите транспортную компанию!");
      setIsLoading(false);
      return false;
    }
    if (
      delivery_method !== "Самовывоз" &&
      (!city.trim() || !street.trim() || !house.trim())
    ) {
      setErrorMessage("Заполните все адресные данные!");
      setIsLoading(false);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    const fullName =
      `${formData.lastName.trim()} ${formData.firstName.trim()} ${formData.middleName.trim()}`.trim();

    try {
      const result = await onSubmit({
        ...formData,
        name: fullName,
        total_price: totalPrice,
        cart: cartItems,
      });
      if (result.success) {
        setSuccessMessage("Заказ успешно оформлен!");
        setTimeout(() => {
          setIsLoading(false);
          onClose();
        }, 1500);
      } else {
        setErrorMessage(result.message || "Ошибка при оформлении заказа");
      }
    } catch (error) {
      setErrorMessage("Ошибка сервера. Попробуйте снова позже.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Оформление заказа</h2>

        <input
          type="text"
          name="lastName"
          placeholder="Фамилия"
          value={formData.lastName}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
          required
        />
        <input
          type="text"
          name="firstName"
          placeholder="Имя"
          value={formData.firstName}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
          required
        />
        <input
          type="text"
          name="middleName"
          placeholder="Отчество"
          value={formData.middleName}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
        />

        <InputMask
          mask="+7 (999) 999-99-99"
          value={formData.phone}
          onChange={handleChange}
        >
          {(inputProps) => (
            <input
              type="tel"
              name="phone"
              placeholder="Телефон"
              {...inputProps}
              className="w-full mb-2 p-2 border rounded"
              required
            />
          )}
        </InputMask>

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
          required
        />

        <select
          name="delivery_method"
          value={formData.delivery_method}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
        >
          <option value="Самовывоз">Самовывоз</option>
          <option value="Доставка">Доставка</option>
          <option value="Отправка в регион">Отправка в регион</option>
        </select>

        {formData.delivery_method === "Отправка в регион" && (
          <select
            name="transport_company"
            value={formData.transport_company}
            onChange={handleChange}
            className="w-full mb-2 p-2 border rounded"
          >
            <option value="">Выберите ТК</option>
            {TRANSPORT_COMPANIES.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        )}

        {formData.delivery_method !== "Самовывоз" && (
          <>
            <input
              type="text"
              name="city"
              placeholder="Город"
              value={formData.city}
              onChange={handleChange}
              className="w-full mb-2 p-2 border rounded"
              required
            />
            <input
              type="text"
              name="street"
              placeholder="Улица"
              value={formData.street}
              onChange={handleChange}
              className="w-full mb-2 p-2 border rounded"
              required
            />
            <input
              type="text"
              name="house"
              placeholder="Дом"
              value={formData.house}
              onChange={handleChange}
              className="w-full mb-2 p-2 border rounded"
              required
            />
            <input
              type="text"
              name="apartment"
              placeholder="Квартира (необязательно)"
              value={formData.apartment}
              onChange={handleChange}
              className="w-full mb-2 p-2 border rounded"
            />
          </>
        )}

        <textarea
          name="comment"
          placeholder="Комментарий к заказу (необязательно)"
          value={formData.comment}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
        ></textarea>

        {/* Блок для сообщений об ошибке и успешном оформлении */}
        {errorMessage && (
          <p className="text-red-600 text-sm mb-2">{errorMessage}</p>
        )}
        {successMessage && (
          <p className="text-green-600 text-sm mb-2">{successMessage}</p>
        )}

        <div className="flex justify-between mt-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`bg-green-600 text-white px-4 py-2 rounded ${
              isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
            }`}
          >
            Оформить
          </button>
          <button
            onClick={onClose}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-800"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderModal;

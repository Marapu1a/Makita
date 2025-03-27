import { useState } from "react";
import { updatePart } from "../api/api";

interface Part {
  id: number;
  name: string;
  part_number: string;
  price: number;
  availability: boolean;
}

interface PartEditorProps {
  part: Part;
  onClose: () => void;
}

const PartEditor: React.FC<PartEditorProps> = ({ part, onClose }) => {
  const [editedPart, setEditedPart] = useState<Part>(part);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      await updatePart(editedPart.id, {
        name: editedPart.name,
        price: editedPart.price,
        availability: editedPart.availability,
      });
      onClose(); // Закрываем по сохранению
    } catch (err) {
      console.error("Ошибка при обновлении детали", err);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        {!isEditing ? (
          <>
            <h3 className="text-lg font-semibold mb-4">{editedPart.name}</h3>
            <div className="flex gap-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={() => setIsEditing(true)}
              >
                Редактировать
              </button>
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={onClose}
              >
                Отмена
              </button>
            </div>
          </>
        ) : (
          <div>
            <label className="block mb-2">
              Название:
              <input
                type="text"
                className="w-full p-2 border rounded mt-1"
                value={editedPart.name}
                onChange={(e) =>
                  setEditedPart({ ...editedPart, name: e.target.value })
                }
              />
            </label>

            <label className="block mb-2">
              Цена:
              <input
                type="number"
                className="w-full p-2 border rounded mt-1"
                value={editedPart.price}
                onChange={(e) =>
                  setEditedPart({
                    ...editedPart,
                    price: parseFloat(e.target.value),
                  })
                }
              />
            </label>

            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={editedPart.availability}
                onChange={(e) =>
                  setEditedPart({
                    ...editedPart,
                    availability: e.target.checked,
                  })
                }
              />
              Доступность
            </label>

            <div className="flex gap-4">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded"
                onClick={handleSave}
              >
                Сохранить
              </button>
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={() => setIsEditing(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartEditor;

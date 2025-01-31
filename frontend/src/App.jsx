import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "./App.css";

const App = () => {
  return (
    <div className="container">
      <SlideViewer />
      <PartsTable />
    </div>
  );
};

const Tooltip = ({ style, children }) => {
  return ReactDOM.createPortal(
    <div className="tooltip" style={style}>
      {children}
    </div>,
    document.body
  );
};

const SlideViewer = () => {
  const [slides, setSlides] = useState([]);
  const [hoveredPart, setHoveredPart] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});

  useEffect(() => {
    fetch("http://localhost:5000/api/slides/model/1")
      .then((res) => res.json())
      .then((data) => setSlides(data))
      .catch((err) => console.error(err));
  }, []);

  const handleMouseEnter = (part, event) => {
    setHoveredPart(part);
    const { clientX, clientY } = event;
    setTooltipStyle({
      top: clientY - 200 + "px", // Сдвиг вверх
      left: clientX - 50 + "px", // Немного левее мыши
    });
  };

  const handleMouseLeave = () => {
    setHoveredPart(null);
  };

  return (
    <div className="slide-viewer">
      {slides.map((slide) => (
        <div key={slide.slide_number} className="slide">
          <img
            src={`/images/DPC6201/${slide.image_path}`}
            alt={`Slide ${slide.slide_number}`}
            style={{ width: slide.image_width, height: slide.image_height }}
          />
          {slide.Parts.map((part) => (
            <div
              key={part.id}
              className="part-box"
              style={{
                top: part.y_coord,
                left: part.x_coord,
                width: part.width,
                height: part.height,
              }}
              onMouseEnter={(e) => handleMouseEnter(part, e)}
              onMouseLeave={handleMouseLeave}
            >
              {hoveredPart?.id === part.id && (
                <Tooltip style={tooltipStyle}>
                  <p>Артикул: {part.part_number}</p>
                  <p>Название: {part.name || "Не указано"}</p>
                  <p>Цена: {part.price} руб.</p>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const PartsTable = () => {
  const [parts, setParts] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/parts/model/1")
      .then((res) => res.json())
      .then((data) => setParts(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="parts-table">
      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Артикул</th>
            <th>Название</th>
            <th>Цена</th>
            <th>Количество</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr key={part.id}>
              <td>{part.number}</td>
              <td>{part.part_number}</td>
              <td>{part.name || "Не указано"}</td>
              <td>{part.price} руб.</td>
              <td>{part.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;

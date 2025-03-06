interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  className = "",
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 bg-cyan-900 text-white border border-white rounded-sm transition-all duration-100 hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-white ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;

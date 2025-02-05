type SidebarProps = {
  categories: string[];
};

export default function Sidebar({ categories }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-200 p-4 rounded-md">
      <h2 className="text-lg font-semibold mb-4">Каталог товаров</h2>
      <ul className="space-y-2">
        {categories.map((category, index) => (
          <li key={index} className="hover:text-red-600 cursor-pointer">
            {category}
          </li>
        ))}
      </ul>
    </aside>
  );
}

/* /src/modules/sidebar/sidebar.tsx */

export default function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-44 flex-shrink-0 border-r glass-effect"
      style={{ borderColor: 'var(--tertiary-color)' }}
    >
      <nav className="p-4 mt-4">
        <ul>
          <li className="p-2 rounded-md cursor-pointer nav-item-hover">
            Example
          </li>
          <li className="p-2 rounded-md cursor-pointer nav-item-hover">
            Example
          </li>
          <li className="p-2 rounded-md cursor-pointer nav-item-hover">
            Example
          </li>
        </ul>
      </nav>
    </aside>
  );
}

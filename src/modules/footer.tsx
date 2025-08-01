/* /src/modules/footer.tsx */

import { version } from '../../package.json';
import ThemeToggle from '~/modules/theme-toggle';

export default function Footer() {
  return (
    <footer
      className="h-12 w-full flex-shrink-0 flex items-center justify-between px-6 text-sm border-t glass-effect"
      style={{
        borderColor: 'var(--tertiary-color)',
        color: 'var(--subtext-color)',
      }}
    >
      <p>
        <a
          href="https://www.copyright.gov/what-is-copyright/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Copyright
        </a>
        &nbsp;&copy; 2025{' '}
        <a
          href="https://github.com/canmi21"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Canmi
        </a>
        .{' '}
        <a
          href="https://github.com/resources/articles/software-development/what-is-open-source-software"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          OSS
        </a>{' '}
        under{' '}
        <a
          href="https://www.fsf.org/licensing/licenses/agpl-3.0.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          AGPL-3.0
        </a>
        .
      </p>
      <div className="flex items-center space-x-4">
        <a
          href="https://github.com/rfshub"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Github
        </a>
        <span>
          <a
            href="https://github.com/rfshub/canopy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Canopy
          </a>
          &nbsp;v{version}
        </span>
        <ThemeToggle />
      </div>
    </footer>
  );
}
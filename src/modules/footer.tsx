/* /src/modules/footer.tsx */

'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from '~/modules/theme-toggle';

export default function Footer({ version }: { version: string }) {
  const [isPortrait, setIsPortrait] = useState(true);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  return (
    <footer
      className="h-12 w-full flex-shrink-0 flex items-center justify-between px-6 text-sm border-t glass-effect"
      style={{
        borderColor: 'var(--tertiary-color)',
        color: 'var(--subtext-color)',
      }}
    >
      {isPortrait ? (
        <>
          <p>
            &copy; 2025{' '}
            <a
              href="https://github.com/canmi21"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Canmi
            </a>
            .
          </p>
          <a
            href="https://github.com/rfshub"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Github
          </a>
          <a
            href="https://github.com/rfshub/canopy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Canopy
          </a>
          <ThemeToggle />
        </>
      ) : (
        <>
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
              {` v${version}`}
            </span>
            <ThemeToggle />
          </div>
        </>
      )}
    </footer>
  );
}
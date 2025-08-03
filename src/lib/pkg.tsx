/* /src/lib/pkg.tsx */

import { readFile } from 'fs/promises';
import { join } from 'path';
import Console from './console';

interface PackageJson {
  name: string;
  version: string;
}

export default async function Pkg() {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson: PackageJson = JSON.parse(packageJsonContent);
    const { name, version } = packageJson;
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    return <Console name={capitalizedName} version={version} />;
  } catch (error) {
    console.error('Failed to read package.json:', error);
    // Fallback values if package.json reading fails
    return <Console name="Canopy" version="unknown" />;
  }
}
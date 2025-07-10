/**
 * Showcase Container Component
 *
 * Provides consistent styling and structure for all showcase demos
 */

import type { ReactNode } from 'react';

interface ShowcaseContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ShowcaseContainer({ title, description, children }: ShowcaseContainerProps) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {description && (
          <p className="text-lg text-gray-600">{description}</p>
        )}
      </div>
      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
}

interface ShowcaseSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ShowcaseSection({ title, description, children }: ShowcaseSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

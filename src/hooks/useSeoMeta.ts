import { useEffect } from 'react';

export function useSeoMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', description);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = description;
      document.head.appendChild(newMeta);
    }
    return () => {
      // Reset to default on unmount
      document.title = 'NutriZen — Menus personnalisés';
    };
  }, [title, description]);
}

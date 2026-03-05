-- Delete test articles
DELETE FROM seo_articles 
WHERE keyword ILIKE '%cuisiner sainement%' 
   OR keyword ILIKE '%recettes équilibrées%'
   OR outline->>'title' ILIKE '%cuisiner sainement%'
   OR outline->>'title' ILIKE '%recettes équilibrées%';

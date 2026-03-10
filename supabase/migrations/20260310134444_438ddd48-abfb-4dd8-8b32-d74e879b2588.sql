-- Clean up existing internal SEO labels in seo_articles
UPDATE seo_articles SET cluster_context = 'Nutrition'
WHERE LOWER(cluster_context) LIKE '%longue%'
   OR LOWER(cluster_context) LIKE '%pilier%'
   OR LOWER(cluster_context) LIKE '%tier%'
   OR LOWER(cluster_context) LIKE '%cluster%'
   OR LOWER(cluster_context) LIKE '%seo%'
   OR LOWER(cluster_context) LIKE '%quick%';

UPDATE seo_articles SET cluster_context = 'Fitness'
WHERE LOWER(cluster_context) LIKE '%fitness%'
   OR LOWER(cluster_context) LIKE '%muscul%';

UPDATE seo_articles SET cluster_context = 'Famille'
WHERE LOWER(cluster_context) LIKE '%famille%'
   OR LOWER(cluster_context) LIKE '%enfant%';

UPDATE seo_articles SET cluster_context = 'Santé'
WHERE LOWER(cluster_context) LIKE '%sant%'
   OR LOWER(cluster_context) LIKE '%digest%';
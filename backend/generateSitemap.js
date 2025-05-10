require('dotenv').config({
    path: '.env.development' // или .env.production, если надо
});
const fs = require('fs');
const path = require('path');
const { Categories, Model } = require('./models'); // путь подкорректируй, если другой
const sequelize = require('./db');


const BASE_URL = 'https://makita-remont.ru';

(async () => {
    try {
        await sequelize.authenticate();

        const urls = new Set();

        // Главная, корзина, контакты, политика
        urls.add(`${BASE_URL}/`);
        urls.add(`${BASE_URL}/cart`);
        urls.add(`${BASE_URL}/contacts`);
        urls.add(`${BASE_URL}/privacy-policy`);

        // Категории
        const categories = await Categories.findAll();
        categories.forEach((cat) => {
            urls.add(`${BASE_URL}/categories/${cat.id}`);
        });

        // Модели
        const models = await Model.findAll();
        models.forEach((model) => {
            urls.add(`${BASE_URL}/model/${model.id}`);
        });

        // Генерация sitemap.xml
        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls]
                .map(
                    (url) => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
                )
                .join('\n')}
</urlset>`;

        // Сохраняем в public/sitemap.xml
        const outputPath = path.join(__dirname, 'sitemap.xml');
        fs.writeFileSync(outputPath, sitemapXml, 'utf-8');

        console.log(`✅ sitemap.xml создан по пути: ${outputPath}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при генерации sitemap:', error);
        process.exit(1);
    }
})();

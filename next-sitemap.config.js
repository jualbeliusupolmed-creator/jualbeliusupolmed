/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.kampuskita.my.id',
  generateRobotsTxt: true, 
  sitemapSize: 5000,
  exclude: ['/admin', '/admin/*'], // Exclude admin routes from indexing
}

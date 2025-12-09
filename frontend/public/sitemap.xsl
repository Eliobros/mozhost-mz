<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>Sitemap - MozHost</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 14px;
            background: #f5f5f5;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 40px;
          }
          h1 {
            color: #2563eb;
            margin: 0 0 10px 0;
            font-size: 32px;
          }
          .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e5e5;
          }
          tr:hover {
            background: #f9fafb;
          }
          a {
            color: #2563eb;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .priority-high { color: #16a34a; font-weight: bold; }
          .priority-medium { color: #ea580c; }
          .priority-low { color: #6b7280; }
          .stats {
            background: #f9fafb;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .stats span {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 MozHost Sitemap</h1>
          <p class="subtitle">Este sitemap contém <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs</p>
          
          <div class="stats">
            <p>Total de páginas indexadas: <span><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></span></p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 60%">URL</th>
                <th style="width: 15%">Prioridade</th>
                <th style="width: 15%">Frequência</th>
                <th style="width: 10%">Última Modificação</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a href="{sitemap:loc}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <xsl:attribute name="class">
                      <xsl:choose>
                        <xsl:when test="sitemap:priority >= 0.8">priority-high</xsl:when>
                        <xsl:when test="sitemap:priority >= 0.5">priority-medium</xsl:when>
                        <xsl:otherwise>priority-low</xsl:otherwise>
                      </xsl:choose>
                    </xsl:attribute>
                    <xsl:value-of select="sitemap:priority"/>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:lastmod"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

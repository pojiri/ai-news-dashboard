// AI記事自動取得システム
class AINewsFetcher {
    constructor() {
        this.articles = [];
        this.sources = [
            {
                name: 'ITmedia AI+',
                rss: 'https://rss.itmedia.co.jp/rss/2.0/aitplus.xml',
                category: '🤖 技術'
            },
            {
                name: 'VentureBeat AI',
                rss: 'https://venturebeat.com/ai/feed/',
                category: '🚀 ビジネス'
            },
            {
                name: 'The Verge AI',
                rss: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
                category: '📱 テック'
            }
        ];
        this.keywords = ['AI', '人工知能', 'ChatGPT', 'GPT', '機械学習', 'OpenAI', 'Google', 'Microsoft'];
    }

    // CORS対応のプロキシを使ってRSSを取得
    async fetchRSS(url) {
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            return data.contents;
        } catch (error) {
            console.error('RSS取得エラー:', error);
            return null;
        }
    }

    // XMLを解析して記事を抽出
    parseRSS(xmlString, source) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');
        const items = doc.querySelectorAll('item');
        
        const articles = [];
        items.forEach((item, index) => {
            if (index >= 5) return; // 最新5件のみ
            
            const title = item.querySelector('title')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            
            // AI関連キーワードチェック
            const content = (title + ' ' + description).toLowerCase();
            const isAIRelated = this.keywords.some(keyword => 
                content.includes(keyword.toLowerCase())
            );
            
            if (isAIRelated && title && link) {
                articles.push({
                    title: this.cleanText(title),
                    summary: this.cleanText(description).substring(0, 150) + '...',
                    url: link,
                    date: this.formatDate(pubDate),
                    source: source.name,
                    category: source.category
                });
            }
        });
        
        return articles;
    }

    // HTMLタグを除去
    cleanText(text) {
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent || div.innerText || '';
    }

    // 日付フォーマット
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '最近';
        }
    }

    // 全ソースから記事を取得
    async fetchAllNews() {
        console.log('🔍 AI記事を取得中...');
        this.articles = [];
        
        for (const source of this.sources) {
            try {
                console.log(`📡 ${source.name} から取得中...`);
                const rssContent = await this.fetchRSS(source.rss);
                if (rssContent) {
                    const sourceArticles = this.parseRSS(rssContent, source);
                    this.articles.push(...sourceArticles);
                    console.log(`✅ ${source.name}: ${sourceArticles.length}件取得`);
                }
            } catch (error) {
                console.error(`❌ ${source.name} 取得失敗:`, error);
            }
        }
        
        // 重複除去（タイトルベース）
        const uniqueArticles = this.articles.filter((article, index, self) =>
            index === self.findIndex(a => a.title === article.title)
        );
        
        this.articles = uniqueArticles.slice(0, 6); // 最新6件
        console.log(`🎉 合計 ${this.articles.length} 件の記事を取得しました！`);
        
        return this.articles;
    }

    // 記事をHTMLに表示
    displayArticles(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (this.articles.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.8);">
                    <h3>📡 記事を取得中...</h3>
                    <p>少々お待ちください</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.articles.map(article => `
            <div class="article-card">
                <div class="article-tag">${article.category}</div>
                <div class="article-title">${article.title}</div>
                <div class="article-meta">
                    <span>📅 ${article.date}</span>
                    <span>📰 ${article.source}</span>
                </div>
                <div class="article-summary">${article.summary}</div>
                <a href="${article.url}" target="_blank" class="read-more">
                    記事を読む →
                </a>
            </div>
        `).join('');
        
        // アニメーション表示
        setTimeout(() => {
            container.classList.add('show');
        }, 100);
    }
}

// グローバルインスタンス
window.aiNewsFetcher = new AINewsFetcher();

// 実際のAI記事を取得する関数
async function showRealAINews() {
    const container = document.getElementById('news-container');
    container.classList.remove('show');
    
    // ローディング表示
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: rgba(255,255,255,0.8);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
            <h3>最新のAI記事を取得中...</h3>
            <p>世界中のAI情報サイトから記事を収集しています</p>
            <div style="margin-top: 2rem;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #ff6b6b; animation: spin 1s ease-in-out infinite;"></div>
            </div>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    try {
        // 実際の記事を取得
        await window.aiNewsFetcher.fetchAllNews();
        
        // 記事を表示
        window.aiNewsFetcher.displayArticles('news-container');
        
    } catch (error) {
        console.error('記事取得エラー:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.8);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>記事の取得に失敗しました</h3>
                <p>しばらく時間をおいて再度お試しください</p>
                <button onclick="showRealAINews()" class="main-button" style="margin-top: 1rem;">
                    再試行
                </button>
            </div>
        `;
    }
}

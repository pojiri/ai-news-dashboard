// 改良版 AI記事自動取得システム
class AINewsFetcher {
    constructor() {
        this.articles = [];
        this.sources = [
            {
                name: 'TechCrunch AI',
                rss: 'https://techcrunch.com/tag/artificial-intelligence/feed/',
                category: '🚀 スタートアップ'
            },
            {
                name: 'Wired AI',
                rss: 'https://www.wired.com/tag/artificial-intelligence/feed/',
                category: '🔬 テクノロジー'
            },
            {
                name: 'MIT Technology Review',
                rss: 'https://www.technologyreview.com/feed/',
                category: '🎓 研究'
            },
            {
                name: 'The Verge AI',
                rss: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
                category: '📱 ガジェット'
            },
            {
                name: 'VentureBeat AI',
                rss: 'https://venturebeat.com/ai/feed/',
                category: '💼 ビジネス'
            },
            {
                name: 'Ars Technica AI',
                rss: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
                category: '⚙️ 技術'
            }
        ];
        
        // より幅広いAI関連キーワード
        this.keywords = [
            'ai', 'artificial intelligence', 'machine learning', 'deep learning',
            'chatgpt', 'gpt', 'openai', 'google ai', 'microsoft ai',
            'neural network', 'automation', 'robot', 'algorithm',
            'claude', 'gemini', 'llm', 'generative ai', 'copilot'
        ];
    }

    // RSS2JSON APIを使用（より安定）
    async fetchRSS(url) {
        try {
            const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
            console.log(`📡 取得中: ${url}`);
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (data.status !== 'ok') {
                throw new Error(`RSS2JSON Error: ${data.message}`);
            }
            
            return data.items || [];
        } catch (error) {
            console.error('RSS取得エラー:', error);
            return [];
        }
    }

    // 記事がAI関連かチェック（より緩い判定）
    isAIRelated(title, description) {
        const content = (title + ' ' + description).toLowerCase();
        return this.keywords.some(keyword => content.includes(keyword));
    }

    // HTMLタグを除去して文字を整理
    cleanText(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerHTML = text;
        return (div.textContent || div.innerText || '').trim();
    }

    // 日付を見やすい形式に変換
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
            
            if (diffHours < 24) {
                return `${diffHours}時間前`;
            } else if (diffHours < 168) { // 1週間
                return `${Math.floor(diffHours / 24)}日前`;
            } else {
                return date.toLocaleDateString('ja-JP', {
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch {
            return '最近';
        }
    }

    // 全ソースから記事を取得
    async fetchAllNews() {
        console.log('🔍 AI記事を取得開始...');
        this.articles = [];
        let totalAttempts = 0;
        let successfulSources = 0;
        
        for (const source of this.sources) {
            try {
                totalAttempts++;
                console.log(`📡 ${source.name} から取得中...`);
                
                const items = await this.fetchRSS(source.rss);
                
                if (items.length === 0) {
                    console.log(`⚠️ ${source.name}: 記事が見つかりませんでした`);
                    continue;
                }
                
                let sourceArticleCount = 0;
                
                // 最新10件をチェック
                for (const item of items.slice(0, 10)) {
                    const title = this.cleanText(item.title);
                    const description = this.cleanText(item.description || item.content);
                    
                    if (!title || !item.link) continue;
                    
                    // AI関連チェック
                    if (this.isAIRelated(title, description)) {
                        const article = {
                            title: title,
                            summary: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
                            url: item.link,
                            date: this.formatDate(item.pubDate),
                            source: source.name,
                            category: source.category,
                            pubDate: item.pubDate // ソート用
                        };
                        
                        this.articles.push(article);
                        sourceArticleCount++;
                        
                        if (sourceArticleCount >= 3) break; // 1ソースあたり最大3件
                    }
                }
                
                if (sourceArticleCount > 0) {
                    successfulSources++;
                    console.log(`✅ ${source.name}: ${sourceArticleCount}件取得`);
                } else {
                    console.log(`🔍 ${source.name}: AI関連記事が見つかりませんでした`);
                }
                
            } catch (error) {
                console.error(`❌ ${source.name} 取得失敗:`, error);
            }
            
            // 少し待機（レート制限対策）
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 重複除去（タイトルの類似性チェック）
        const uniqueArticles = [];
        for (const article of this.articles) {
            const isDuplicate = uniqueArticles.some(existing => {
                const similarity = this.calculateSimilarity(article.title, existing.title);
                return similarity > 0.7; // 70%以上類似していれば重複とみなす
            });
            
            if (!isDuplicate) {
                uniqueArticles.push(article);
            }
        }
        
        // 日付順でソート（新しい順）
        this.articles = uniqueArticles
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 9); // 最大9件表示
        
        console.log(`🎉 合計 ${this.articles.length} 件のAI記事を取得しました！`);
        console.log(`📊 ${successfulSources}/${totalAttempts} のソースから取得成功`);
        
        return this.articles;
    }

    // タイトルの類似度計算（簡易版）
    calculateSimilarity(str1, str2) {
        const words1 = str1.toLowerCase().split(/\s+/);
        const words2 = str2.toLowerCase().split(/\s+/);
        const intersection = words1.filter(word => words2.includes(word));
        return intersection.length / Math.max(words1.length, words2.length);
    }

    // 記事をHTMLに表示
    displayArticles(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (this.articles.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: rgba(255,255,255,0.8);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">😔</div>
                    <h3>AI記事を取得できませんでした</h3>
                    <p>現在、記事の取得に問題が発生しています</p>
                    <p style="font-size: 0.9rem; margin-top: 1rem; opacity: 0.7;">
                        ネットワークの問題、またはサイト側の制限が原因の可能性があります
                    </p>
                    <button onclick="showRealAINews()" class="main-button" style="margin-top: 2rem; padding: 0.8rem 2rem;">
                        🔄 再試行
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.articles.map((article, index) => `
            <div class="article-card" style="animation-delay: ${index * 0.1}s;">
                <div class="article-tag">${article.category}</div>
                <div class="article-title">${article.title}</div>
                <div class="article-meta">
                    <span>🕒 ${article.date}</span>
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
            <div style="font-size: 3rem; margin-bottom: 1rem; animation: bounce 2s infinite;">🔍</div>
            <h3>最新のAI記事を収集中...</h3>
            <p>世界中のAI情報サイトから記事を集めています</p>
            <div style="margin: 2rem 0; font-size: 0.9rem; opacity: 0.7;">
                <div>TechCrunch • Wired • MIT Tech Review</div>
                <div>The Verge • VentureBeat • Ars Technica</div>
            </div>
            <div style="margin-top: 2rem;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #ff6b6b; animation: spin 1s ease-in-out infinite;"></div>
            </div>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
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
            <div style="text-align: center; padding: 3rem; color: rgba(255,255,255,0.8);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>記事の取得に失敗しました</h3>
                <p>技術的な問題が発生しています</p>
                <details style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
                    <summary>エラー詳細</summary>
                    <pre style="text-align: left; margin-top: 0.5rem;">${error.message}</pre>
                </details>
                <button onclick="showRealAINews()" class="main-button" style="margin-top: 2rem;">
                    🔄 再試行
                </button>
            </div>
        `;
    }
}

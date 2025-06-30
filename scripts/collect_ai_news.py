#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests
import feedparser
import os
from datetime import datetime, timedelta
import re
from urllib.parse import urljoin
import time

class AINewsCollector:
    def __init__(self):
        self.articles = []
        self.sources = [
            {
                'name': 'TechCrunch AI',
                'rss': 'https://techcrunch.com/category/artificial-intelligence/feed/',
                'category': '🚀 スタートアップ'
            },
            {
                'name': 'MIT Technology Review',
                'rss': 'https://www.technologyreview.com/feed/',
                'category': '🎓 研究'
            },
            {
                'name': 'The Verge AI',
                'rss': 'https://www.theverge.com/rss/index.xml',
                'category': '📱 テック'
            },
            {
                'name': 'Ars Technica',
                'rss': 'https://feeds.arstechnica.com/arstechnica/index',
                'category': '⚙️ 技術'
            },
            {
                'name': 'Wired',
                'rss': 'https://www.wired.com/feed/rss',
                'category': '🔬 テクノロジー'
            }
        ]
        
        # AI関連キーワード
        self.ai_keywords = [
            'artificial intelligence', 'ai', 'machine learning', 'deep learning',
            'neural network', 'chatgpt', 'gpt', 'openai', 'google ai',
            'microsoft ai', 'claude', 'gemini', 'llm', 'large language model',
            'generative ai', 'automation', 'robot', 'algorithm', 'copilot',
            'bard', 'anthropic', 'midjourney', 'stable diffusion'
        ]

    def clean_text(self, text):
        """HTMLタグを除去してテキストをクリーンにする"""
        if not text:
            return ""
        
        # HTMLタグを除去
        clean = re.compile('<.*?>')
        text = re.sub(clean, '', text)
        
        # 特殊文字を正規化
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        text = text.replace('&#39;', "'")
        
        return text.strip()

    def is_ai_related(self, title, description):
        """記事がAI関連かどうかをチェック"""
        content = (title + ' ' + description).lower()
        return any(keyword in content for keyword in self.ai_keywords)

    def format_date(self, date_string):
        """日付を相対表記に変換"""
        try:
            article_date = datetime.strptime(date_string, '%a, %d %b %Y %H:%M:%S %z')
            now = datetime.now(article_date.tzinfo)
            diff = now - article_date
            
            if diff.days == 0:
                hours = diff.seconds // 3600
                if hours == 0:
                    return "数分前"
                return f"{hours}時間前"
            elif diff.days == 1:
                return "1日前"
            elif diff.days < 7:
                return f"{diff.days}日前"
            else:
                return article_date.strftime('%m月%d日')
        except:
            return "最近"

    def fetch_rss(self, url, source_name):
        """RSSフィードを取得して解析"""
        try:
            print(f"📡 {source_name} から記事を取得中...")
            
            # ユーザーエージェントを設定してアクセス
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            # feedparserで解析
            feed = feedparser.parse(response.content)
            
            if feed.bozo:
                print(f"⚠️  {source_name}: フィード解析に問題がありました")
            
            articles = []
            for entry in feed.entries[:15]:  # 最新15件をチェック
                try:
                    title = self.clean_text(entry.title)
                    description = self.clean_text(entry.get('description', '') or entry.get('summary', ''))
                    
                    if not title or not entry.link:
                        continue
                    
                    # AI関連かチェック
                    if self.is_ai_related(title, description):
                        article = {
                            'title': title,
                            'summary': description[:300] + ('...' if len(description) > 300 else ''),
                            'url': entry.link,
                            'date': self.format_date(entry.get('published', '')),
                            'source': source_name,
                            'category': '',  # あとで設定
                            'published_date': entry.get('published', ''),
                            'collected_at': datetime.now().isoformat()
                        }
                        articles.append(article)
                
                except Exception as e:
                    print(f"⚠️  記事処理エラー: {e}")
                    continue
            
            print(f"✅ {source_name}: {len(articles)}件のAI記事を取得")
            return articles
            
        except Exception as e:
            print(f"❌ {source_name} 取得失敗: {e}")
            return []

    def collect_all_news(self):
        """全ソースから記事を収集"""
        print("🔍 AI記事の収集を開始します...")
        
        all_articles = []
        
        for source in self.sources:
            articles = self.fetch_rss(source['rss'], source['name'])
            
            # カテゴリを設定
            for article in articles:
                article['category'] = source['category']
            
            all_articles.extend(articles)
            
            # レート制限対策で少し待機
            time.sleep(1)
        
        # 重複除去（URLベース）
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            if article['url'] not in seen_urls:
                seen_urls.add(article['url'])
                unique_articles.append(article)
        
        # 日付でソート（新しい順）
        try:
            unique_articles.sort(
                key=lambda x: datetime.fromisoformat(x['collected_at']), 
                reverse=True
            )
        except:
            pass
        
        # 最新12件に限定
        self.articles = unique_articles[:12]
        
        print(f"🎉 合計 {len(self.articles)} 件のユニークなAI記事を収集しました")
        return self.articles

    def save_to_json(self):
        """記事データをJSONファイルに保存"""
        # dataディレクトリを作成
        os.makedirs('data', exist_ok=True)
        
        # メタデータを追加
        data = {
            'last_updated': datetime.now().isoformat(),
            'total_articles': len(self.articles),
            'sources_count': len(self.sources),
            'articles': self.articles
        }
        
        # JSONファイルに保存
        with open('data/articles.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"💾 記事データを data/articles.json に保存しました")

def main():
    collector = AINewsCollector()
    
    try:
        # 記事を収集
        articles = collector.collect_all_news()
        
        if articles:
            # JSONファイルに保存
            collector.save_to_json()
            print("✅ AI記事の収集が完了しました！")
        else:
            print("⚠️  記事を取得できませんでした")
            
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")

if __name__ == "__main__":
    main()

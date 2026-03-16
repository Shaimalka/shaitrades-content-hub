export interface InstagramStats {
  username: string
  followers_count: number
  following_count: number
  media_count: number
  biography: string
  website: string
  profile_picture_url: string
}

export interface InstagramPost {
  id: string
  caption: string
  media_type: string
  media_url: string
  permalink: string
  timestamp: string
  like_count: number
  comments_count: number
  engagement_rate?: number
}

export interface Competitor {
  username: string
  niche: string
  followers?: number
  avg_engagement?: number
  top_posts?: CompetitorPost[]
  last_scraped?: string
}

export interface CompetitorPost {
  url: string
  caption: string
  likes: number
  comments: number
  views?: number
  engagement_rate: number
  posted_at: string
  media_type: string
  hook?: string
}

export interface WeeklyReport {
  week_of: string
  top_posts: CompetitorPost[]
  content_ideas: ContentIdea[]
  emerging_creators: string[]
  summary: string
}

export interface ContentIdea {
  title: string
  hook_options: string[]
  script: string
  caption: string
  hashtags: string[]
  format: string
  why_it_works: string
}

export interface CalendarPost {
  date: string
  content_type: string
  topic: string
  hook: string
  status: 'planned' | 'scripted' | 'filmed' | 'posted'
}

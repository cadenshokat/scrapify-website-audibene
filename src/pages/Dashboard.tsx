
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { Activity, Database, FileText, Image, TrendingUp, TableProperties, Clock } from "lucide-react"
import { useRegion } from "@/hooks/useRegion"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useAuth } from "@/hooks/useAuth"
import { Separator } from "@/components/ui/separator"

interface DashboardStats {
  totalScrapeData: number
  totalAnstrexData: number
  totalTopHeadlines: number
  totalFavorites: number
  todaysScrapes: number
  avgFrequency: number
}

function calculateNextScrape(now: Date) {
  const startHour = 9, endHour = 17, markMin = 30

  const todayStart = new Date(now)
  todayStart.setHours(startHour, markMin, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(endHour, markMin, 0, 0)

  if (now < todayStart) {
    return { type: "before", next: todayStart }
  }
  if (now >= todayEnd) {
    return { type: "after", next: null }
  }

  const thisMark = new Date(now)
  thisMark.setMinutes(markMin, 0, 0)
  if (now < thisMark) {
    return { type: "running", next: thisMark }
  }
  const nextMark = new Date(now)
  nextMark.setHours(now.getHours() + 1, markMin, 0, 0)
  if (nextMark > todayEnd) {
    return { type: "after", next: null }
  }
  return { type: "running", next: nextMark }
}


const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalScrapeData: 0,
    totalAnstrexData: 0,
    totalTopHeadlines: 0,
    totalFavorites: 0,
    todaysScrapes: 0,
    avgFrequency: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentHeadlines, setRecentHeadlines] = useState<any[]>([])
  const { region } = useRegion()
  const german = region === 'DE'
  const { session } = useAuth()
  const user = session?.user.id

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const [scrapeData, anstrexData, topHeadlines, favorites] = await Promise.all([
        supabase.from('Scrape Data').select('*', { count: 'exact' }).eq('region', region),
        supabase.from('Anstrex Data').select('*', { count: 'exact' }).eq('region', region),
        supabase.from('Top 20').select('*', { count: 'exact' }),
        supabase.from('favorites').select('*', { count: 'exact' }).eq('user', user)
      ])

      const today = new Date().toISOString().split('T')[0]
      const { count: todayCount } = await supabase
        .from('Scrape Data')
        .select('*', { count: 'exact' })
        .eq('region', region)
        .gte('date', today)

      const { data: frequencyData } = await supabase
        .from('Top 20')
        .select('frequency')

      const avgFreq = frequencyData?.length 
        ? frequencyData.reduce((acc, curr) => acc + (curr.frequency || 0), 0) / frequencyData.length
        : 0

      const { data: recentData } = await supabase
        .from('Scrape Data')
        .select('headline, brand, date, platform')
        .eq('region', region)
        .order('date', { ascending: false })
        .limit(20)

      setStats({
        totalScrapeData: scrapeData.count || 0,
        totalAnstrexData: anstrexData.count || 0,
        totalTopHeadlines: topHeadlines.count || 0,
        totalFavorites: favorites.count || 0,
        todaysScrapes: todayCount || 0,
        avgFrequency: Math.round(avgFreq)
      })

      setRecentHeadlines(recentData || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

   const [countdown, setCountdown] = useState<{ label: string; time?: string }>({
    label: "--", 
  })

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const { type, next } = calculateNextScrape(now)

      if (region === 'US') {
        if (type === "before" && next) {
          const diff = next.getTime() - now.getTime()
          const mins = String(Math.floor(diff / 60000)).padStart(2, "0")
          const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0")
          setCountdown({ label: "Scrapers start in", time: `${mins}:${secs}` })
        }
        else if (type === "after") {
          setCountdown({ label: "All done for the day" })
        }
        else if (type === "running" && next) {
          const diff = next.getTime() - now.getTime()
          const mins = String(Math.floor(diff / 60000)).padStart(2, "0")
          const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0")
          setCountdown({ label: "Next scrape in", time: `${mins}:${secs}` })
        }
      }
      if (region === 'DE') {
          if (type === "before" && next) {
          const diff = next.getTime() - now.getTime()
          const mins = String(Math.floor(diff / 60000)).padStart(2, "0")
          const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0")
          setCountdown({ label: "Die Scraper starten in", time: `${mins}:${secs}` })
        }
        else if (type === "after") {
          setCountdown({ label: "Für heute ist alles erledigt" })
        }
        else if (type === "running" && next) {
          const diff = next.getTime() - now.getTime()
          const mins = String(Math.floor(diff / 60000)).padStart(2, "0")
          const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0")
          setCountdown({ label: "Nächstes Kratzen in", time: `${mins}:${secs}` })
        }
      }
    }

    tick()
    const interval = setInterval(tick, 1_000)
    return () => clearInterval(interval)
  }, [region])

  const getPlatformColor = (platform: string | null) => {
    if (!platform) return "bg-gray-100 text-gray-800"
    const colors: { [key: string]: string } = {
      MSN: "bg-blue-100 text-blue-800",
      Yahoo: "bg-purple-100 text-purple-800", 
      Fox: "bg-red-100 text-red-800",
      NBC: "bg-green-100 text-green-800",
      AOL: "bg-orange-100 text-orange-800"
    }
    return colors[platform] || "bg-gray-100 text-gray-800"
  }

  useEffect(() => {
    fetchDashboardData()
  }, [region])

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 space-y-6 bg-[#ffffff] ">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 ml-2">{german ? 'Übersicht' : 'Dashboard'}</h1>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-y-6">
        <div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{german ? 'Gesamtzahl der gelöschten Anzeigen': 'Total Scraped Ads'}</CardTitle>
            <Database className="text-[#127846] h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScrapeData.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todaysScrapes} {german ? 'Anzeigen heute gescraped': 'ads scraped today'}
            </p>
          </CardContent>
        </div>
        <Separator orientation="vertical" className="h-full"/>
        <div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anstrex Data</CardTitle>
            <TableProperties className="text-[#127846] h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAnstrexData.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {german ? 'Anzeigen diese Woche gelöscht' : '75 ads scraped this week'}
            </p>
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{german ? 'Top-Schlagzeilen' : 'Top Headlines'}</CardTitle>
            <FileText className="text-[#127846] h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTopHeadlines}</div>
            <p className="text-xs text-muted-foreground">
              {german ? 'Die wichtigsten Schlagzeilen der Woche' : 'Top weekly headlines'}
            </p>
          </CardContent>
        </div>
        
        <div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{german ? 'Favoriten' : 'Favorites'}</CardTitle>
            <TrendingUp className="text-[#127846] h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFavorites}</div>
            <p className="text-xs text-muted-foreground">
              {german ? 'Bevorzugte Schlagzeilen' : 'Favorited headlines'}
            </p>
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{german ? 'Heutige Aktivität' : 'Today\'s Activity'}</CardTitle>
            <Activity className="text-[#127846] h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaysScrapes}</div>
            <p className="text-xs text-muted-foreground">
              {german ? 'Heute gelöschte Anzeigen' : 'Scraped ads today'}
            </p>
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{german ? 'Zeit bis zum nächsten Scraping' : 'Time Until Next Scrape'}</CardTitle>
            <Clock className="text-[#127846] h-4 w-4" />
          </CardHeader>
          <CardContent>
            {countdown.time ? (
              <>
                <div className="text-2xl font-bold">{countdown.time}</div>
                <div className="text-xs text-gray-600 mb-1">{countdown.label}</div>
              </>
            ) : (
              <div className="text-2xl font-bold">{countdown.label}</div>
            )}
          </CardContent>
        </div>
      </div>

      <Separator />

      {/* Recent Activity */}
      <div>
        <CardHeader>
          <CardTitle>{german ? 'Aktuelle Schlagzeilen' : 'Recent Headlines'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentHeadlines.map((headline, index) => (
              <div key={index} className="flex items-center justify-between p-3 border bg-none rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <p className="font-medium text-sm">{german ?  `„${headline.headline}"` : `"${headline.headline}"`}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {headline.brand && <Badge variant="outline">{headline.brand}</Badge>}
                    {headline.platform && <Badge variant="secondary" className={getPlatformColor(headline.platform)}>{headline.platform}</Badge>}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {headline.date ? new Date(headline.date).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </div>
  )
}

export default Dashboard

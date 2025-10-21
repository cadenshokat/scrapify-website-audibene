import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import TimeFilterDropdown from "@/components/TimeFilterDropdown"
import HeartButton from "@/components/HeartButton"
import SelectButton from "@/components/SelectButton"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useSelectedHeadlines } from "@/hooks/useSelectedHeadlines"
import { useToast } from "@/hooks/use-toast"  
import { FormatNumber } from "@/utils/FormatNumber"
import { useRegion } from "@/hooks/useRegion"
import { Separator } from "@/components/ui/separator"

interface AnstrexDataItem {
  id: string
  brand: string | null
  headline: string
  gravity: number | null
  date: string | null
  network: string | null
  duration: number | null
  image_url: string | null
  strength: number | null
  landing_page_url: string | null
}

const normalizeUrl = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

const openIfUrl = (url: string | null | undefined) => {
  if (!url) return;
  const href = normalizeUrl(url);
  window.open(href, "_blank", "noopener,noreferrer");
};


const AnstrexData = () => {
  const [anstrexData, setAnstrexData] = useState<AnstrexDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [weeks, setWeeks] = useState<number[]>([])
  const [years, setYears] = useState<number[]>([])
  const [week,  setWeek]  = useState<number|null>(null)
  const [year,  setYear]  = useState<number|null>(null)

  const { region } = useRegion()
  const german = region == 'DE'

  const { toast } = useToast()

  const fetchWeekYearOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('Anstrex Data')
        .select('week, year')
        .eq('region', region)
        .gte('week', 20)
        .order('year', { ascending: false })
        .order('week', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error

      setYear(data.year);
      setWeek(data.week);

      const weekArr: number[] = [];
      for (let w = 25; w <= data.week; w++) {
        weekArr.push(w);
      }
      setWeeks(weekArr.reverse());
      setYears([data.year]);
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to load week options', variant: 'destructive' })
    }
  }

  const { selectedHeadlines, loading: loadingSelected, refetch: refetchSelected } = useSelectedHeadlines()

  const isRowSelected = (id: string) =>
    selectedHeadlines.some(sh => sh.source_id === id)

  const fetchAnstrexData = async () => {
    if (week === null || year === null) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('Anstrex Data')
        .select('*')
        .eq('region', region)
        .eq('week', week)
        .eq('year', year)
        .order('strength', { ascending: false })
        .limit(100)

      if (error) throw error
      setAnstrexData(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWeekYearOptions() }, [])
  useEffect(() => { fetchAnstrexData() }, [week, year, region])

  const getGravityColor = (gravity: number | null) => {
    if (!gravity) return "bg-gray-100 text-gray-800"
    if (gravity >= 80) return "bg-green-100 text-green-800"
    if (gravity >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getStrengthColor = (strength: number | null) => {
    if (!strength) return "bg-gray-100 text-gray-800"
    if (strength >= 80) return "bg-blue-100 text-blue-800"
    if (strength >= 60) return "bg-purple-100 text-purple-800"
    return "bg-orange-100 text-orange-800"
  }

  if (loading) return <LoadingSpinner />
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{german ? 'Anstrex-Daten' : 'Anstrex Ads'}</h1>
        </div>
        
        <div className="flex gap-2">
          <Select value={year?.toString() || ''} onValueChange={v => setYear(+v)}>
              <SelectTrigger className="w-24"><SelectValue/></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={week?.toString() || ''} onValueChange={v => setWeek(+v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Week"/></SelectTrigger>
              <SelectContent>
                {weeks.map(w => <SelectItem key={w} value={w.toString()}>{german ? 'Woche' : 'Week'} {w}</SelectItem>)}
              </SelectContent>
            </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center mt-4 gap-4">
        <div>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{anstrexData.length}</div>
            <div className="text-sm text-gray-600">{german ? 'Anzeigen insgesamt' : 'Total Ads'}</div>
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary-light">
              {FormatNumber(Math.round(anstrexData.reduce((acc, item) => acc + (item.gravity || 0), 0) / anstrexData.length)) || 0}
            </div>
            <div className="text-sm text-gray-600">{german ? 'Durchschnittliche Schwerkraft' : 'Avg Gravity'}</div>
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary-dark">
              {FormatNumber(Math.round(anstrexData.reduce((acc, item) => acc + (item.strength || 0), 0) / anstrexData.length)) || 0}
            </div>
            <div className="text-sm text-gray-600">{german ? 'Durchschnittliche Stärke' : 'Avg Strength'}</div>
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {new Set(anstrexData.map(item => item.brand).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">{german ? 'Einzigartige Marken' : 'Unique Brands'}</div>
          </CardContent>
        </div>
      </div>

      <Separator />

      {/* Data Table */}
      <div>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{german ? 'Datum' : 'Date'}</TableHead>
                <TableHead>{german ? 'Marke' : 'Brand'}</TableHead>
                <TableHead>{german ? 'Überschrift' : 'Headline'}</TableHead>
                <TableHead>{german ? 'Schwerkraft' : 'Gravity'}</TableHead>
                <TableHead>{german ? 'Stärke' : 'Strength'}</TableHead>
                <TableHead>{german ? 'Netzwerk' : 'Network'}</TableHead>
                <TableHead>{german ? 'Dauer' : 'Duration'}</TableHead>
                <TableHead>{german ? 'Aktionen' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anstrexData.map((item) => {
                const hasUrl = !!item.landing_page_url;
                const onRowClick = () => hasUrl && openIfUrl(item.landing_page_url);
                const onRowKeyDown = (e: React.KeyboardEvent) => {
                  if (!hasUrl) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openIfUrl(item.landing_page_url);
                  }
                };

                return (
                  <TableRow
                    key={item.id}
                    onClick={onRowClick}
                    onKeyDown={onRowKeyDown}
                    role={hasUrl ? "button" : undefined}
                    tabIndex={hasUrl ? 0 : -1}
                    className={[
                      hasUrl ? "cursor-pointer hover:bg-muted/60 focus:bg-muted/60 outline-none" : "",
                      "transition-colors"
                    ].join(" ")}
                    // prevents row navigation when clicking inner interactive elements
                    onClickCapture={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("button, a, input, [role='button'], [data-stop-row]")
                      ) {
                        e.stopPropagation();
                      }
                    }}
                  >
                    <TableCell>{item.date ? new Date(item.date).toLocaleDateString() : "N/A"}</TableCell>
                    <TableCell>{item.brand || "Unknown"}</TableCell>

                    <TableCell
                      className="max-w-md whitespace-normal break-words"
                      title={item.headline}
                    >
                      {item.headline}
                      {hasUrl && (
                        <span className="ml-2 text-xs text-primary underline">
                          {/* tiny affordance to hint it's clickable */}
                          {german ? "öffnet Landingpage" : "opens landing page"}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge className={getGravityColor(item.gravity)}>
                        {FormatNumber(item.gravity) || "0"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge className={getStrengthColor(item.strength)}>
                        {FormatNumber(item.strength) || "0"}
                      </Badge>
                    </TableCell>

                    <TableCell>{item.network || "Unknown"}</TableCell>
                    <TableCell>{item.duration ? `${item.duration} days` : "0"}</TableCell>

                    <TableCell>
                      <SelectButton
                        headline={item.headline}
                        sourceTable="anstrex_data"
                        sourceId={item.id}
                        region={region}
                        brand={item.brand || undefined}
                        isSelected={isRowSelected(item.id)}
                        onSelectionChange={refetchSelected}
                        // mark this as "don't trigger row click"
                        data-stop-row
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          <div className="mt-6 text-center">
            <Button onClick={fetchAnstrexData}>
              {german ? 'Daten aktualisieren' : 'Refresh Data'}
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  )
}

export default AnstrexData

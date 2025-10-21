import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/integrations/supabase/client"
import { Target, TrendingUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SelectButton from "@/components/SelectButton"
import { useToast } from "@/hooks/use-toast"  
import { useSelectedHeadlines } from "@/hooks/useSelectedHeadlines"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useRegion } from "@/hooks/useRegion"
import { Separator } from "@/components/ui/separator"

interface CTRPotentialAd {
  id: string
  headline: string | null
  brand: string | null
  platform: string | null
  position: number | null
  week: number
  year: number
}


const CTRPotential = () => {
  const [items, setItems]       = useState<CTRPotentialAd[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const [weeks, setWeeks] = useState<number[]>([])
  const [years, setYears] = useState<number[]>([])
  const [week,  setWeek]  = useState<number|null>(null)
  const [year,  setYear]  = useState<number|null>(null)

  const { region } = useRegion()
  const german = region == 'DE'

   const { selectedHeadlines, loading: loadingSelected, refetch: refetchSelected } = useSelectedHeadlines()
  
  const isRowSelected = (id: string) =>
    selectedHeadlines.some(sh => sh.source_id === id)
  

  const { toast } = useToast()

  const fetchWeekYearOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('topWeeklyCTR')
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

  const fetchItems = async () => {
    if (week === null || year === null) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('topWeeklyCTR')
        .select('id, headline, brand, platform, position, week, year')
        .eq('week', week)
        .eq('year', year)
        .eq('region', region)
        .order('position', { ascending: true })
      if (error) throw error

      setItems(data || [])
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to load ads', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => { fetchWeekYearOptions() }, [region])
  useEffect(() => { fetchItems() }, [region, week, year])

  if (loading) return <LoadingSpinner />
  if (error)   return <div className="p-6 text-red-600">Error: {error}</div>



  return (
    <div className="p-6 space-y-6 bg-[#ffffff]">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{german ? 'CTR Potenzial' : 'CTR Potential'}</h1>
          {/* Filter Criteria */}
          <div>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline">
                  <Target className="w-3 h-3 mr-1" />
                  Position 1-5
                </Badge>
                <Badge variant="outline">{german ? '30-80 Zeichen' : '30-80 Characters'}</Badge>
                <Badge variant="outline">{german ? 'Keine €, /, % symbole' : 'No $, /, % symbols'}</Badge>
                <Badge variant="outline">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {german ? 'Hohes CTR-Potenzial' : 'High CTR Potential'}
                </Badge>
                <Badge variant="outline">{german ? 'Wöchentliche Daten' : 'Weekly Data'}</Badge>
              </div>
            </CardContent>
          </div>
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
          <Button onClick={fetchItems} variant="outline">{german ? 'Aktualisieren' : 'Refresh'}</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center mt-4 gap-4">
        <div>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{items.length}</div>
            <div className="text-sm text-gray-600">{german ? 'Potenzielle Anzeigen' : 'Potential Ads'}</div>
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary-light">
              {Math.round(items.reduce((acc, item) => acc + (item.headline?.length || 0), 0) / items.length) || 0}
            </div>
            <div className="text-sm text-gray-600">{german ? 'Durchschnittliche Anzahl Zeichen' : 'Avg Characters'}</div>
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div>
          <div className="p-4">
            <div className="text-2xl font-bold text-primary-dark">
              {new Set(items.map(item => item.platform).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">{german ? 'Plattformen' : 'Platforms'}</div>
          </div>
        </div>
        <Separator orientation="vertical" />
        <div>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {new Set(items.map(item => item.brand).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">{german ? 'Einzigartige Marken' : 'Unique Brands'}</div>
          </CardContent>
        </div>
      </div>
      <Separator />
      {/* CTR Potential Table */}
      <div>
        <CardHeader>
          <CardTitle>{german ? 'Anzeigen mit hoher Klickrate' : 'High CTR Potential Ads'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{german ? 'Plattform' : 'Platform'}</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>{german ? 'Überschrift' : 'Headline'}</TableHead>
                <TableHead>{german ? 'Marke' : 'Brand'}</TableHead>
                <TableHead>{german ? 'Charaktere' : 'Characters'}</TableHead>
                <TableHead>{german ? 'Aktionen' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge className={getPlatformColor(item.platform)}>
                      {item.platform || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      #{item.position}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="font-medium mb-1">
                      "{item.headline || 'No headline'}"
                    </div>
                  </TableCell>
                  <TableCell>{item.brand || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.headline?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SelectButton
                        headline={item.headline || ''}
                        sourceTable="scrape_data"
                        sourceId={item.id}
                        region={region}
                        brand={item.brand || undefined}
                        isSelected={isRowSelected(item.id)}
                        onSelectionChange={refetchSelected}
                      />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={fetchItems}>
              {german ? 'Daten aktualisieren' : 'Refresh Data'}
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  )
}

export default CTRPotential

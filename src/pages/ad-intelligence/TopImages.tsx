import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { Image as ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useRegion } from "@/hooks/useRegion"

interface TopImage {
  source_id: string | null
  image_url: string | null
  frequency: number
}

export default function TopImages() {
  const [items, setItems] = useState<TopImage[]>([])
  const [weeks, setWeeks] = useState<number[]>([])
  const [years, setYears] = useState<number[]>([])
  const [week, setWeek] = useState<number | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { region } = useRegion()
  const german = region == 'DE'

  const fetchWeekYearOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('topWeeklyImages')
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
        .from('topWeeklyImages')
        .select('source_id, image_url, frequency')
        .eq('region', region)
        .eq('week', week)
        .eq('year', year)
        .order('frequency', { ascending: false })
        .limit(20)
      if (error) throw error

      setItems(data || [])
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to load images', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeekYearOptions()
  }, [region])

  useEffect(() => {
    fetchItems()
  }, [region, week, year])

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 space-y-6 bg-[#ffffff]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{german ? 'Top Bilder' : 'Top Images'}</h1>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((item, idx) => (
          <div key={item.source_id || idx} className="border rounded overflow-hidden shadow-sm">
            <div className="relative">
              {item.image_url ? (
                <a href={item.image_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={item.image_url}
                    alt={`Ad ${idx + 1}`}
                    className="w-full h-48 object-cover"
                    onError={e => { e.currentTarget.src = '/placeholder.svg' }}
                  />
                </a>
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-1 bg-white/75 rounded text-sm font-semibold">
                #{idx + 1}
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">{item.frequency} uses</span>
                {/* Placeholder for any future action buttons */}
              </div>
            </CardContent>
          </div>
        ))}
      </div>
    </div>
  )
}

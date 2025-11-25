import { useState } from "react"
import { Calendar, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type TimeRangePreset = 'today' | 'week' | 'month' | '3months' | 'custom'

interface TimeRangeProps {
    value: {
        preset: TimeRangePreset
        customStart?: string
        customEnd?: string
    }
    onChange: (value: {
        preset: TimeRangePreset
        customStart?: string
        customEnd?: string
    }) => void
    className?: string
}

const presetOptions = [
    { value: 'today' as const, label: 'Last 24 hours', description: 'Data from the past 24 hours' },
    { value: 'week' as const, label: 'Last 7 days', description: 'Data from the past week' },
    { value: 'month' as const, label: 'Last 30 days', description: 'Data from the past month' },
    { value: '3months' as const, label: 'Last 3 months', description: 'Data from the past 3 months' },
    { value: 'custom' as const, label: 'Custom range', description: 'Select specific start and end dates' }
]

export function TimeRangeSelector({ value, onChange, className }: TimeRangeProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handlePresetChange = (preset: TimeRangePreset) => {
        if (preset === 'custom') {
            // Keep existing custom dates if switching to custom
            onChange({
                preset,
                customStart: value.customStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                customEnd: value.customEnd || new Date().toISOString().split('T')[0]
            })
        } else {
            onChange({ preset })
        }
    }

    const handleCustomDateChange = (field: 'customStart' | 'customEnd', date: string) => {
        onChange({
            ...value,
            [field]: date
        })
    }

    const selectedOption = presetOptions.find(option => option.value === value.preset)

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isOpen}
                        className="justify-between min-w-[200px]"
                    >
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="truncate">
                                {selectedOption?.label || 'Select time range'}
                            </span>
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                    <div className="space-y-1 p-2">
                        {presetOptions.map((option) => (
                            <Button
                                key={option.value}
                                variant={value.preset === option.value ? "default" : "ghost"}
                                className="w-full justify-start h-auto p-3"
                                onClick={() => handlePresetChange(option.value)}
                            >
                                <div className="text-left">
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {option.description}
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {value.preset === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                    <div className="space-y-1">
                        <Label htmlFor="start-date" className="text-xs">From</Label>
                        <Input
                            id="start-date"
                            type="date"
                            value={value.customStart || ''}
                            onChange={(e) => handleCustomDateChange('customStart', e.target.value)}
                            className="w-40"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="end-date" className="text-xs">To</Label>
                        <Input
                            id="end-date"
                            type="date"
                            value={value.customEnd || ''}
                            onChange={(e) => handleCustomDateChange('customEnd', e.target.value)}
                            className="w-40"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

// Helper function to format time range for display
export function formatTimeRangeDisplay(timeRange: {
    preset: TimeRangePreset
    customStart?: string
    customEnd?: string
}): string {
    const option = presetOptions.find(opt => opt.value === timeRange.preset)

    if (timeRange.preset === 'custom' && timeRange.customStart && timeRange.customEnd) {
        const start = new Date(timeRange.customStart).toLocaleDateString()
        const end = new Date(timeRange.customEnd).toLocaleDateString()
        return `${start} - ${end}`
    }

    return option?.label || 'Last 7 days'
}
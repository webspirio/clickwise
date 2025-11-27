"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Event } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface GetColumnsProps {
    onTrack: (event: Event) => void
    onIgnore: (event: Event) => void
    onDelete: (event: Event) => void
}

export const getColumns = ({
    onTrack,
    onIgnore,
    onDelete,
}: GetColumnsProps): ColumnDef<Event>[] => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Event Name" />
            ),
            cell: ({ row }) => {
                const event = row.original
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{event.alias || event.name}</span>
                        {event.alias && (
                            <span className="text-xs text-muted-foreground">{event.name}</span>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "type",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => {
                return (
                    <Badge variant="outline" className="font-normal">
                        {row.getValue("type")}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "selector",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Selector" />
            ),
            cell: ({ row }) => {
                return (
                    <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs">
                        {row.getValue("selector") || "N/A"}
                    </code>
                )
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                return (
                    <Badge
                        variant={
                            status === "tracked"
                                ? "default"
                                : status === "ignored"
                                    ? "secondary"
                                    : "outline"
                        }
                    >
                        {status}
                    </Badge>
                )
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const event = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(event.selector || "")}
                            >
                                Copy selector
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {event.status !== "tracked" && (
                                <DropdownMenuItem onClick={() => onTrack(event)}>
                                    Track Event
                                </DropdownMenuItem>
                            )}
                            {event.status !== "ignored" && (
                                <DropdownMenuItem onClick={() => onIgnore(event)}>
                                    Ignore Event
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(event)}
                                className="text-destructive focus:text-destructive"
                            >
                                Delete Event
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

<script setup lang="ts">
const props = defineProps<{
  class?: string | Record<string, boolean> | (string | undefined)[];
  ui?: {
    root?: string;
    base?: string;
  };
}>();

const tableContainerRef = ref<HTMLElement | null>(null);
const toast = useToast();
const copied = ref(false);
const hasData = ref(false);
const rowCount = ref(0);

function extractTableData(): { headers: string[]; rows: string[][] } {
  if (!tableContainerRef.value) return { headers: [], rows: [] };
  const table = tableContainerRef.value.querySelector("table");
  if (!table) return { headers: [], rows: [] };

  const headers: string[] = [];
  const thEls = table.querySelectorAll("thead th, tr:first-child th");
  thEls.forEach((th) => {
    headers.push(th.textContent?.trim().replace(/\s+/g, " ") || "");
  });

  const rows: string[][] = [];
  const trEls = table.querySelectorAll("tbody tr");
  if (trEls.length > 0) {
    trEls.forEach((tr) => {
      const row: string[] = [];
      tr.querySelectorAll("td").forEach((td) => {
        row.push(td.textContent?.trim().replace(/\s+/g, " ") || "");
      });
      if (row.length > 0) rows.push(row);
    });
  } else {
    // If no thead/tbody separation
    const allTrs = table.querySelectorAll("tr");
    allTrs.forEach((tr, idx) => {
      if (idx === 0 && headers.length > 0) return;
      const row: string[] = [];
      tr.querySelectorAll("td").forEach((td) => {
        row.push(td.textContent?.trim().replace(/\s+/g, " ") || "");
      });
      if (row.length > 0) rows.push(row);
    });
  }

  return { headers, rows };
}

function updateTableMeta() {
  const { rows } = extractTableData();
  rowCount.value = rows.length;
  hasData.value = rows.length > 0;
}

onMounted(() => {
  nextTick(() => {
    updateTableMeta();
  });
});

async function copyTable() {
  const { headers, rows } = extractTableData();
  if (!headers.length && !rows.length) return;

  const lines: string[] = [];
  if (headers.length) {
    lines.push(headers.join("\t"));
  }
  rows.forEach((r) => lines.push(r.join("\t")));

  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    copied.value = true;
    toast.add({
      title: "Table copied",
      description: "Tab-separated table copied to clipboard.",
      color: "success",
    });
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    toast.add({
      title: "Failed to copy",
      description: err instanceof Error ? err.message : "Clipboard permission denied",
      color: "error",
    });
  }
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function downloadCsv() {
  const { headers, rows } = extractTableData();
  if (!headers.length && !rows.length) return;

  const csvRows: string[] = [];
  if (headers.length) {
    csvRows.push(headers.map(escapeCsvCell).join(","));
  }
  rows.forEach((row) => {
    csvRows.push(row.map(escapeCsvCell).join(","));
  });

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `table-export-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.add({
    title: "CSV Downloaded",
    description: `Exported ${rows.length} rows to CSV.`,
    color: "success",
  });
}
</script>

<template>
  <div
    ref="tableContainerRef"
    class="group/table relative my-4 overflow-hidden rounded-xl border border-default bg-elevated/20 shadow-xs"
  >
    <!-- Table Header Toolbar -->
    <div class="flex items-center justify-between border-b border-default bg-elevated/40 px-3 py-1.5 text-xs text-muted">
      <div class="flex items-center gap-1.5 font-mono text-[11px] text-muted">
        <UIcon
          name="i-lucide-table-2"
          class="size-3.5 text-primary"
        />
        <span>Table Data</span>
        <span
          v-if="rowCount > 0"
          class="rounded bg-muted/30 px-1 py-0.2 text-[10px] text-dimmed"
        >
          {{ rowCount }} {{ rowCount === 1 ? 'row' : 'rows' }}
        </span>
      </div>

      <div class="flex items-center gap-1">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          class="h-6 gap-1 px-1.5 text-[11px]"
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          :aria-label="copied ? 'Copied' : 'Copy table to clipboard'"
          @click="copyTable"
        >
          <span class="hidden sm:inline">{{ copied ? 'Copied' : 'Copy' }}</span>
        </UButton>

        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          class="h-6 gap-1 px-1.5 text-[11px]"
          icon="i-lucide-download"
          aria-label="Download CSV"
          @click="downloadCsv"
        >
          <span class="hidden sm:inline">CSV</span>
        </UButton>
      </div>
    </div>

    <!-- Scrollable Table Box -->
    <div class="max-w-full overflow-x-auto overscroll-x-contain">
      <table
        class="w-full min-w-max border-collapse text-left text-xs text-toned"
        :class="props.class"
      >
        <slot />
      </table>
    </div>
  </div>
</template>

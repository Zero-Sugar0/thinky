export interface PhoneCode {
  name: string;
  code: string;
  emoji: string;
  dialCode: string;
  mask: string;
}

export const PHONE_CODES: PhoneCode[] = [
  { name: "Ghana", code: "GH", emoji: "🇬🇭", dialCode: "+233", mask: "### ### ####" },
  { name: "France", code: "FR", emoji: "🇫🇷", dialCode: "+33", mask: "# ## ## ## ##" },
  { name: "United States", code: "US", emoji: "🇺🇸", dialCode: "+1", mask: "(###) ###-####" },
  { name: "United Kingdom", code: "GB", emoji: "🇬🇧", dialCode: "+44", mask: "#### ######" },
  { name: "Germany", code: "DE", emoji: "🇩🇪", dialCode: "+49", mask: "### ########" },
  { name: "Spain", code: "ES", emoji: "🇪🇸", dialCode: "+34", mask: "### ### ###" },
  { name: "Italy", code: "IT", emoji: "🇮🇹", dialCode: "+39", mask: "### ### ####" },
  { name: "Canada", code: "CA", emoji: "🇨🇦", dialCode: "+1", mask: "(###) ###-####" },
  { name: "Belgium", code: "BE", emoji: "🇧🇪", dialCode: "+32", mask: "### ## ## ##" },
  { name: "Switzerland", code: "CH", emoji: "🇨🇭", dialCode: "+41", mask: "## ### ## ##" },
  { name: "Netherlands", code: "NL", emoji: "🇳🇱", dialCode: "+31", mask: "## ########" },
  { name: "Portugal", code: "PT", emoji: "🇵🇹", dialCode: "+351", mask: "### ### ###" },
  { name: "Japan", code: "JP", emoji: "🇯🇵", dialCode: "+81", mask: "##-####-####" },
  { name: "Singapore", code: "SG", emoji: "🇸🇬", dialCode: "+65", mask: "#### ####" },
  { name: "Australia", code: "AU", emoji: "🇦🇺", dialCode: "+61", mask: "### ### ###" },
  { name: "Brazil", code: "BR", emoji: "🇧🇷", dialCode: "+55", mask: "## #####-####" },
  { name: "India", code: "IN", emoji: "🇮🇳", dialCode: "+91", mask: "##### #####" },
  { name: "Mexico", code: "MX", emoji: "🇲🇽", dialCode: "+52", mask: "## #### ####" },
];

export function findPhoneCode(code: string) {
  return PHONE_CODES.find(entry => entry.code === code);
}

export function parsePhoneNumber(value: string, defaultCountry = "FR") {
  const trimmed = value.trim();
  if (!trimmed) {
    return { countryCode: defaultCountry, local: "" };
  }

  const normalized = trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/\D/g, "")}`;
  const byDialCode = [...PHONE_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);

  for (const country of byDialCode) {
    if (normalized.startsWith(country.dialCode)) {
      return {
        countryCode: country.code,
        local: normalized.slice(country.dialCode.length).replace(/\D/g, ""),
      };
    }
  }

  return {
    countryCode: defaultCountry,
    local: normalized.replace(/\D/g, ""),
  };
}

export function formatPhoneNumber(countryCode: string, local: string) {
  const country = findPhoneCode(countryCode);
  // Most countries write local numbers with a leading trunk 0 (e.g. 024 … in Ghana); the country code replaces it.
  const digits = local.replace(/\D/g, "").replace(/^0/, "");
  if (!country || !digits) {
    return "";
  }

  return `${country.dialCode}${digits}`;
}

import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";

// Contact number and current public program, managed in the backend
// (PUBLIC_CONTACT_PHONE setting and the Program model). Fetched once per page load.
let siteInfoRequest = null;

const empty = { contactPhone: "", contactPhoneIntl: "", program: null, isLoading: true };

function toIntl(phone) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("0") ? `+254${digits.slice(1)}` : digits;
}

export function formatProgramDates(program) {
  const format = (value, options) =>
    new Intl.DateTimeFormat("en-KE", options).format(new Date(`${value}T00:00:00`));
  const day = { weekday: "short", day: "numeric", month: "short" };
  return `${format(program.starts_on, day)} – ${format(program.ends_on, { ...day, year: "numeric" })}`;
}

export function formatProgramEnd(program) {
  return new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${program.ends_on}T00:00:00`)
  );
}

export default function useSiteInfo() {
  const [info, setInfo] = useState(empty);

  useEffect(() => {
    let isMounted = true;
    siteInfoRequest ??= apiRequest("public/site/").catch((error) => {
      siteInfoRequest = null;
      throw error;
    });
    siteInfoRequest
      .then((data) => {
        if (isMounted) {
          setInfo({
            contactPhone: data.contact_phone,
            contactPhoneIntl: toIntl(data.contact_phone),
            program: data.program,
            isLoading: false,
          });
        }
      })
      .catch(() => {
        if (isMounted) setInfo({ ...empty, isLoading: false });
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return info;
}

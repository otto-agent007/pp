"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { buttonClassName } from "@pest-patrol/ui";
import { useActiveBrandSkin } from "./brand";

export function PortalShareCard({
  copyButtonRef,
  copied,
  copyButtonLabel = "Copy link",
  description,
  onCopy,
  portalUrl,
  title = "Customer portal link",
}: {
  copyButtonRef?: (element: HTMLButtonElement | null) => void;
  copied?: boolean;
  copyButtonLabel?: string;
  description?: string;
  onCopy?: () => void;
  portalUrl: string;
  title?: string;
}) {
  const brandSkin = useActiveBrandSkin();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const cardDescription =
    description ??
    `Share this ${brandSkin.portalCompanyName} customer portal link by text or invoice QR code.`;

  useEffect(() => {
    let cancelled = false;

    setQrCodeUrl(null);
    setQrError(false);
    void QRCode.toDataURL(portalUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 168,
    })
      .then((url) => {
        if (!cancelled) {
          setQrCodeUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [portalUrl]);

  return (
    <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="flex h-[180px] w-[180px] items-center justify-center rounded-md border border-theme-border-subtle bg-theme-background-surface p-3">
        {qrCodeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="QR code for customer portal link"
            className="h-full w-full object-contain"
            src={qrCodeUrl}
          />
        ) : (
          <p className="text-center text-xs font-semibold text-theme-text-muted">
            {qrError ? "QR unavailable" : "Building QR"}
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-2">
        <div>
          <p className="text-sm font-semibold text-theme-text-primary">
            {title}
          </p>
          <p className="mt-1 text-xs text-theme-text-secondary">
            {cardDescription}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-10 min-w-0 flex-1 rounded-md border border-theme-border-default bg-theme-background-surface px-3 font-mono text-xs text-theme-text-primary outline-none focus:border-theme-action-primary"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={portalUrl}
          />
          {onCopy ? (
            <button
              className={buttonClassName({ size: "sm", variant: "ghost" })}
              onClick={onCopy}
              ref={copyButtonRef}
              type="button"
            >
              {copied ? "Copied!" : copyButtonLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

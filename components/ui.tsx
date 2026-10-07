'use client';

import type { ComponentProps } from 'react';

import {
  Dialog as D,
  AlertDialog as A,
  Tabs as T,
  Checkbox as C
} from 'radix-ui';

export const Dialog = D.Root;
export const DialogTitle = D.Title;
export const DialogDescription = D.Description;

export function DialogContent({
  children,
  className = '',
  showCloseButton = true,
  ...props
}: ComponentProps<typeof D.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="modal-overlay" />

      <D.Content
        {...props}
        className={'modal-content ' + className}
      >
        {children}

        {showCloseButton && (
          <D.Close
            className="modal-close"
            aria-label="Close"
          >
            ×
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

export const AlertDialog = A.Root;
export const AlertDialogTitle = A.Title;
export const AlertDialogDescription = A.Description;

export function AlertDialogContent({
  children,
  ...props
}: ComponentProps<typeof A.Content>) {
  return (
    <A.Portal>
      <A.Overlay className="modal-overlay" />

      <A.Content
        {...props}
        className="modal-content alert-content"
      >
        {children}
      </A.Content>
    </A.Portal>
  );
}

export function AlertDialogCancel(
  props: ComponentProps<typeof A.Cancel>
) {
  return (
    <A.Cancel {...props} className="outline-button" />
  );
}

export const Tabs = T.Root;
export const TabsList = T.List;
export const TabsTrigger = T.Trigger;
export const TabsContent = T.Content;

export function Checkbox(
  props: ComponentProps<typeof C.Root>
) {
  return (
    <C.Root {...props} className="check-box">
      <C.Indicator>✓</C.Indicator>
    </C.Root>
  );
}

export function Table(props: ComponentProps<'table'>) {
  return (
    <div className="table-scroll">
      <table {...props} />
    </div>
  );
}

export function TableHeader(props: ComponentProps<'thead'>) {
  return <thead {...props} />;
}

export function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} />;
}

export function TableRow(props: ComponentProps<'tr'>) {
  return <tr {...props} />;
}

export function TableHead(props: ComponentProps<'th'>) {
  return <th {...props} />;
}

export function TableCell(props: ComponentProps<'td'>) {
  return <td {...props} />;
}

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#111318] group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-foreground",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:bg-[#111318] group-[.toast]:text-foreground group-[.toast]:border-border",
          error: "group-[.toaster]:!bg-[#1a0f10] group-[.toaster]:!text-[#F06060] group-[.toaster]:!border-[#E24B4A]/40",
          success: "group-[.toaster]:!bg-[#0e1a14] group-[.toaster]:!text-[#5CE1A6] group-[.toaster]:!border-[#1D9E75]/40",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

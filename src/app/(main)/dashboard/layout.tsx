import { SubscriptionModalProvider } from "@/lib/providers/subscriptionModalProvider";
import { getActiveProductsWithPrice } from "@/lib/supabase/queries";
import React from "react";

interface LayoutProps {
  children: React.ReactNode;
  params: any;
}

const Layout: React.FC<LayoutProps> = async ({ children, params }) => {
  const { data: products, error } = await getActiveProductsWithPrice();
  return (
    <main className="flex over-hidden h-screen">
      <SubscriptionModalProvider products={error ? [] : products}>
        {children}
      </SubscriptionModalProvider>
    </main>
  );
};

export default Layout;

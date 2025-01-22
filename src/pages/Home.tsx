// src/pages/Home.tsx
import Page from '@/components/page/Page';
import { useInventory } from '@/hooks/useInventory';
import { InventoryViewItem } from '@/types/inventory';
import Card from '@/components/card/Card';
import { FaBox } from 'react-icons/fa';

const Home = () => {
  const { data, isLoading, isError, error } = useInventory();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <Page
        title="Inventory"
        icon={<FaBox />}
        bgColor="bg-gray-800"
        iconColor="text-red-500"
        subtitle="This is the inventory page"
    >

        <Card>
            <Card.Header title="Basic Card Header" />
            <Card.Body>
                This is a basic card with header and body content.
            </Card.Body>
        </Card>


      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800">
          <thead>
            <tr>
              <th className="px-4 py-2">Product Title</th>
              <th className="px-4 py-2">Variant</th>
              <th className="px-4 py-2">Final Price</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((item: InventoryViewItem) => (
              <tr key={item.inventory_id} className="border-t">
                <td className="px-4 py-2">{item.product_title}</td>
                <td className="px-4 py-2">{item.product_variant}</td>
                <td className="px-4 py-2">{item.final_price}</td>
                <td className="px-4 py-2">{item.inventory_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
};

export default Home;
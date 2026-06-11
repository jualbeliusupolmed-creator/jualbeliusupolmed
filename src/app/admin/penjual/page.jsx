import AdminTabPage from "../[tab]/page";

export const dynamic = "force-dynamic";

export default function PenjualPage(props) {
  return <AdminTabPage {...props} params={{ ...props.params, tab: "penjual" }} />;
}

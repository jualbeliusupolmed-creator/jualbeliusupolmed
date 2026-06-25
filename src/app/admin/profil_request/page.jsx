import AdminTabPage from "../[tab]/page";

export const dynamic = "force-dynamic";

export default function ProfilRequestPage(props) {
  return <AdminTabPage {...props} params={{ ...props.params, tab: "profil_request" }} />;
}

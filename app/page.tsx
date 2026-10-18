import FairwayApp from "@/components/fairway-app";
import { websiteSchema } from "@/lib/site";
export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c"),
        }}
      />
      <FairwayApp />
    </>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMatchScore, formatPrice } from "@/lib/format";
import type { Property, SearchResult } from "@/lib/types";

type PropertyCardProps = {
  property: Property | SearchResult;
  showMatch?: boolean;
};

export function PropertyCard({ property, showMatch = false }: PropertyCardProps) {
  const matchScore = "match_score" in property ? property.match_score : null;

  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <Link href={`/properties/${property.id}`}>
        <div className="relative aspect-[4/3] bg-slate-100">
          <Image
            src={property.image_url}
            alt={property.address}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {showMatch && matchScore !== null && (
            <Badge className="absolute left-3 top-3 bg-white/95">
              {formatMatchScore(matchScore)}
            </Badge>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-slate-900">{formatPrice(property.price)}</p>
            <p className="text-sm text-slate-500">
              {property.beds} bd · {property.baths} ba · {property.sqft.toLocaleString()} sqft
            </p>
          </div>
          <p className="line-clamp-2 text-sm text-slate-600">{property.address}</p>
          {property.cities && (
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {property.cities.name}, {property.cities.state}
            </p>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}

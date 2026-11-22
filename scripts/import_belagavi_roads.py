"""Build CivicPulse's local road index from a Belagavi OpenStreetMap extract."""

import argparse
from bisect import bisect_left
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


BBOX = "15.78,74.40,15.95,74.60"  # South, west, north, east. Includes a buffer outside the city.
OVERPASS = "https://overpass-api.de/api/interpreter"
FACILITIES = {"hospital": 100, "fire_station": 100, "ambulance_station": 100,
              "police": 85, "school": 75, "bus_station": 75, "clinic": 70}
NON_MOTOR = {"footway", "steps", "path", "cycleway", "pedestrian", "bridleway"}
HEADER = "id\tway\tname\tclass\tlat1\tlon1\tlat2\tlon2\tconnectivity\tessential\tconfidence\tupdated\n"


def download(endpoint):
    bbox = BBOX
    amenities = "|".join(FACILITIES)
    query = (f'[out:xml][timeout:90];('
             f'way["highway"]({bbox});'
             f'nwr["amenity"~"^({amenities})$"]({bbox});'
             f'nwr["emergency"="ambulance_station"]({bbox});'
             f');(._;>>;);out body;')
    request = urllib.request.Request(
        endpoint + "?" + urllib.parse.urlencode({"data": query}),
        headers={"User-Agent": "CivicPulse-Belagavi-road-import/1.0"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return ET.parse(response).getroot()


def tags(element):
    return {tag.attrib["k"]: tag.attrib["v"] for tag in element.findall("tag")}


def bridge_components(graph):
    """Iterative low-link traversal. Each bridge stores the interval it separates."""
    visited, low, bridges, components = {}, {}, {}, {}
    clock = 0
    for root in graph:
        if root in visited:
            continue
        start = clock
        visited[root] = low[root] = clock
        clock += 1
        stack = [(root, None, None, iter(graph[root]))]
        while stack:
            node, parent, parent_edge, neighbors = stack[-1]
            step = next(neighbors, None)
            if step is None:
                stack.pop()
                if parent is not None:
                    low[parent] = min(low[parent], low[node])
                    if low[node] > visited[parent]:
                        bridges[parent_edge] = (start, visited[node], clock)
                continue
            neighbor, edge = step
            if edge == parent_edge:
                continue
            if neighbor in visited:
                low[node] = min(low[node], visited[neighbor])
            else:
                visited[neighbor] = low[neighbor] = clock
                clock += 1
                stack.append((neighbor, node, edge, iter(graph[neighbor])))
        components[start] = clock
    return visited, bridges, components


def inside(point, ring):
    lat, lon = point
    crossings = False
    for (a_lat, a_lon), (b_lat, b_lon) in zip(ring, ring[1:]):
        if (a_lat > lat) != (b_lat > lat) and lon < a_lon + (b_lon - a_lon) * (lat - a_lat) / (b_lat - a_lat):
            crossings = not crossings
    return crossings


def mapped_access(ring_refs, points, graph):
    if len(ring_refs) < 4 or ring_refs[0] != ring_refs[-1] or any(ref not in points for ref in ring_refs):
        return set()
    ring = [points[ref] for ref in ring_refs]
    lats, lons = zip(*ring)
    south, north, west, east = min(lats), max(lats), min(lons), max(lons)
    interior = {ref for ref in graph if south < points[ref][0] < north and west < points[ref][1] < east
                and inside(points[ref], ring)}
    return {ref for ref in interior if any(neighbor not in interior for neighbor, _ in graph[ref])}


def network(root):
    points, entrances, facilities, ways = {}, set(), [], {}
    for element in root:
        attrs = element.attrib
        info = tags(element)
        kind = element.tag
        if kind == "node":
            key = attrs["id"]
            points[key] = (float(attrs["lat"]), float(attrs["lon"]))
            if info.get("entrance") not in (None, "no", "exit") or info.get("barrier") == "gate":
                entrances.add(key)
            refs = [key]
        elif kind == "way":
            refs = [node.attrib["ref"] for node in element.findall("nd")]
            ways[attrs["id"]] = (info, refs)
        elif kind == "relation":
            refs = [member.attrib["ref"] for member in element.findall("member")
                    if member.attrib["type"] == "node" and member.attrib.get("role") in ("entrance", "access")]
        else:
            continue
        facility = info.get("amenity", info.get("emergency"))
        if facility in FACILITIES:
            boundaries = [member.attrib["ref"] for member in element.findall("member")
                          if member.attrib["type"] == "way" and member.attrib.get("role") == "outer"]
            facilities.append((FACILITIES[facility], refs, kind, boundaries))

    roads, graph = {}, defaultdict(list)
    for way, (info, refs) in ways.items():
        road_class = info.get("highway")
        if not road_class or road_class in {"construction", "proposed", "abandoned", "platform", "raceway"}:
            continue
        motor = road_class not in NON_MOTOR and info.get("motor_vehicle", info.get("access")) != "no"
        for a, b in zip(refs, refs[1:]):
            if a == b or a not in points or b not in points or points[a] == points[b]:
                continue
            edge = f"{way}:{min(a, b)}:{max(a, b)}"
            if edge in roads:
                continue
            roads[edge] = (way, info.get("name", info.get("ref", "")), road_class, a, b, motor)
            if motor:
                graph[a].append((b, edge))
                graph[b].append((a, edge))

    visited, bridges, components = bridge_components(graph)
    facility_positions = []
    for importance, refs, kind, boundaries in facilities:
        outer_rings = [ways[way][1] for way in boundaries if way in ways]
        boundary_nodes = (node for ring in outer_rings for node in ring)
        connected = set(refs if kind in ("node", "relation") else (set(refs) & entrances))
        connected.update(node for node in boundary_nodes if node in entrances)
        for ring in ([refs] if kind == "way" else outer_rings):
            # A drivable edge entering the mapped facility boundary is stronger evidence than proximity.
            connected.update(mapped_access(ring, points, graph))
        positions = sorted(visited[ref] for ref in connected if ref in visited)
        if positions:
            facility_positions.append((importance, positions))

    for edge, (way, name, road_class, a, b, motor) in roads.items():
        connectivity = essential = ""
        if motor:
            connectivity = 35 + min(30, 5 * (len(graph[a]) + len(graph[b])))
            if edge in bridges:
                component_start, down_start, down_end = bridges[edge]
                component_end = components[component_start]
                down_size = down_end - down_start
                up_size = component_end - component_start - down_size
                cut_size = min(down_size, up_size)
                connectivity = min(100, 45 + cut_size * 2)
                for importance, positions in facility_positions:
                    inside = bisect_left(positions, down_end) - bisect_left(positions, down_start)
                    in_component = bisect_left(positions, component_end) - bisect_left(positions, component_start)
                    isolated = inside if down_size <= up_size else in_component - inside
                    if isolated == len(positions):
                        essential = max(essential or 0, importance)
                        connectivity = max(connectivity, 90)
        yield (edge, way, name, road_class, *points[a], *points[b], connectivity, essential, "ESTIMATED")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--osm", type=Path, help="Existing OpenStreetMap XML extract")
    source.add_argument("--download", action="store_true", help="Fetch the Belagavi study area once from Overpass")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--endpoint", default=OVERPASS, help="Overpass HTTPS endpoint for the one-time download")
    parser.add_argument("--save-osm", type=Path, help="Keep the downloaded XML extract for offline reprocessing")
    args = parser.parse_args()
    try:
        root = download(args.endpoint) if args.download else ET.parse(args.osm).getroot()
    except (OSError, ET.ParseError) as error:
        raise SystemExit(f"Could not read Belagavi OSM data: {error}") from error
    if root.tag != "osm" or root.find("remark") is not None:
        raise SystemExit("OSM extract is invalid or incomplete")
    if args.save_osm and args.download:
        args.save_osm.parent.mkdir(parents=True, exist_ok=True)
        ET.ElementTree(root).write(args.save_osm, encoding="utf-8", xml_declaration=True)
    meta = root.find("meta")
    updated = (meta.get("osm_base") if meta is not None else None) or datetime.now(timezone.utc).isoformat()
    output = args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8", newline="") as file:
        file.write(HEADER)
        count = 0
        for row in network(root):
            fields = (str(value).replace("\t", " ").replace("\n", " ").replace("\r", " ") for value in (*row, updated))
            file.write("\t".join(fields) + "\n")
            count += 1
    if not count:
        temporary.unlink()
        raise SystemExit("OSM extract contains no usable roads")
    temporary.replace(output)
    print(f"Indexed {count} OpenStreetMap road segments in {output}")


if __name__ == "__main__":
    main()

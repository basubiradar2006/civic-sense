import unittest
import xml.etree.ElementTree as ET

from import_belagavi_roads import network


def example_network(alternative):
    extra = """
        <way id="300"><nd ref="3"/><nd ref="5"/><tag k="highway" v="service"/></way>
    """ if alternative else ""
    return ET.fromstring(f"""
        <osm>
          <node id="1" lat="15.851" lon="74.510"/>
          <node id="2" lat="15.852" lon="74.510"/>
          <node id="3" lat="15.852" lon="74.511"/>
          <node id="4" lat="15.853" lon="74.510"/>
          <node id="5" lat="15.854" lon="74.510"/>
          <node id="6" lat="15.8535" lon="74.5098"/>
          <node id="7" lat="15.8545" lon="74.5098"/>
          <node id="8" lat="15.8545" lon="74.5102"/>
          <node id="9" lat="15.8535" lon="74.5102"/>
          <node id="10" lat="15.852" lon="74.5101"><tag k="amenity" v="hospital"/></node>
          <way id="100"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="1"/>
            <tag k="highway" v="primary"/></way>
          <way id="200"><nd ref="2"/><nd ref="4"/><nd ref="5"/>
            <tag k="highway" v="residential"/></way>
          <way id="400"><nd ref="6"/><nd ref="7"/><nd ref="8"/><nd ref="9"/><nd ref="6"/>
            <tag k="amenity" v="hospital"/></way>
          {extra}
        </osm>
        """)


class RoadImporterTest(unittest.TestCase):
    def test_residential_link_is_the_only_mapped_hospital_access(self):
        segments = {row[0]: row for row in network(example_network(False))}
        self.assertEqual(100, segments["200:2:4"][9])
        self.assertEqual(90, segments["200:2:4"][8])
        self.assertEqual("", segments["100:1:2"][9])

    def test_alternative_route_prevents_sole_access_inference(self):
        segments = {row[0]: row for row in network(example_network(True))}
        self.assertEqual("", segments["200:2:4"][9])
        self.assertLess(segments["200:2:4"][8], 90)


if __name__ == "__main__":
    unittest.main()

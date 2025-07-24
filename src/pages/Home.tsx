import { Box, Container } from "@mui/material";
import Section1 from "components/HomePageComponents/Section1";
import Section2 from "components/HomePageComponents/Section2";
import Section3 from "components/HomePageComponents/Section3";
import Section4 from "components/HomePageComponents/Section4";
import NodeInfoPanel from "components/NodeInfoPanel";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import { NodeObject } from "modules/universe/NeuroJsonGraph";
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { fetchRegistry } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";

const Home: React.FC = () => {
  const dispatch = useAppDispatch();
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);
  const { registry, loading } = useAppSelector(NeurojsonSelector);

  // State for selected node and panel visibility
  const [selectedNode, setSelectedNode] = useState<NodeObject | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState<string>(""); // State for filter input
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchRegistry());
  }, [dispatch]);

  // Handle node click: Set selected node and open panel
  const handleNodeClick = useCallback((node: NodeObject) => {
    setSelectedNode(node);
    setPanelOpen(true);
  }, []);

  // filter logic
  const filteredRegistry = useMemo(() => {
    return registry
      ? registry.filter((node) => {
          const matchKeyword = node.name
            .toLowerCase()
            .includes(filterKeyword.toLowerCase());
          const matchModalities =
            selectedModalities.length === 0 ||
            selectedModalities.some((modality) =>
              Array.isArray(node.datatype)
                ? node.datatype.includes(modality)
                : node.datatype === modality
            );
          return matchKeyword && matchModalities;
        })
      : [];
  }, [registry, filterKeyword, selectedModalities]);

  return (
    <Container // container for the home page
      style={{
        minWidth: "100%",
        maxHeight: "99%",
        padding: 0,
        overflow: "hidden",
        position: "relative",
        minHeight: "500px",
      }}
    >
      {/* section 1 */}
      <Box sx={{ position: "relative" }}>
        <Section1
          scrollToNext={() =>
            section2Ref.current?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </Box>

      {/* section 2 */}
      <Box ref={section2Ref} sx={{ position: "relative" }}>
        <Section2
          registry={registry}
          filteredRegistry={filteredRegistry}
          filterKeyword={filterKeyword}
          selectedModalities={selectedModalities}
          setFilterKeyword={setFilterKeyword}
          setSelectedModalities={setSelectedModalities}
          onNodeClick={handleNodeClick}
          scrollToNext={() =>
            section3Ref.current?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </Box>

      {/* section 3 */}
      <Box ref={section3Ref} sx={{ position: "relative" }}>
        <Section3
          scrollToNext={() =>
            section4Ref.current?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </Box>

      {/* section 4*/}
      <Box ref={section4Ref}>
        <Section4 />
      </Box>

      <NodeInfoPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        nodeData={selectedNode}
      />
    </Container>
  );
};

export default Home;

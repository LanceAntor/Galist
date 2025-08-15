// LinkedListValidator.js - Validates user's linked list against expected structure

export class LinkedListValidator {
  constructor(expectedSequence, expectedAddresses) {
    this.expectedSequence = expectedSequence;
    this.expectedAddresses = expectedAddresses;
  }

  // Validate the user's linked list structure
  validateLinkedList(circles, connections) {
    try {
      // Check if we have the right number of circles
      if (circles.length !== this.expectedSequence.length) {
        return {
          isCorrect: false,
          message: `Expected ${this.expectedSequence.length} nodes, but found ${circles.length} nodes.`,
          details: "Make sure you create all required nodes."
        };
      }

      // Check if all expected values exist
      const userValues = circles.map(c => parseInt(c.value));
      const missingValues = this.expectedSequence.filter(val => !userValues.includes(val));
      const extraValues = userValues.filter(val => !this.expectedSequence.includes(val));

      if (missingValues.length > 0 || extraValues.length > 0) {
        return {
          isCorrect: false,
          message: `Incorrect values found.`,
          details: `Missing: [${missingValues.join(', ')}], Extra: [${extraValues.join(', ')}]`
        };
      }

      // Check if all expected addresses exist
      const userAddresses = circles.map(c => c.address);
      const expectedAddrs = Object.values(this.expectedAddresses);
      const missingAddresses = expectedAddrs.filter(addr => !userAddresses.includes(addr));
      const extraAddresses = userAddresses.filter(addr => !expectedAddrs.includes(addr));

      if (missingAddresses.length > 0 || extraAddresses.length > 0) {
        return {
          isCorrect: false,
          message: `Incorrect addresses found.`,
          details: `Missing: [${missingAddresses.join(', ')}], Extra: [${extraAddresses.join(', ')}]`
        };
      }

      // Check value-address mapping
      for (const circle of circles) {
        const expectedAddr = this.expectedAddresses[circle.value];
        if (circle.address !== expectedAddr) {
          return {
            isCorrect: false,
            message: `Incorrect address mapping.`,
            details: `Value ${circle.value} should have address ${expectedAddr}, but has ${circle.address}`
          };
        }
      }

      // Validate the linked list structure (connections)
      const structureValidation = this.validateLinkedListStructure(circles, connections);
      if (!structureValidation.isCorrect) {
        return structureValidation;
      }

      return {
        isCorrect: true,
        message: "🎉 Congratulations! Your linked list is correct!",
        details: "Perfect structure, values, addresses, and connections!"
      };

    } catch (error) {
      return {
        isCorrect: false,
        message: "Error validating linked list.",
        details: error.message
      };
    }
  }

  // Validate the structure/connections of the linked list
  validateLinkedListStructure(circles, connections) {
    // Build a map of value to circle ID
    const valueToId = {};
    circles.forEach(circle => {
      valueToId[parseInt(circle.value)] = circle.id;
    });

    // Check if we have the right number of connections
    if (connections.length !== this.expectedSequence.length - 1) {
      return {
        isCorrect: false,
        message: `Expected ${this.expectedSequence.length - 1} connections, but found ${connections.length}.`,
        details: "Make sure all nodes are properly connected in sequence."
      };
    }

    // Validate the sequence of connections
    for (let i = 0; i < this.expectedSequence.length - 1; i++) {
      const currentValue = this.expectedSequence[i];
      const nextValue = this.expectedSequence[i + 1];
      
      const currentId = valueToId[currentValue];
      const nextId = valueToId[nextValue];

      // Check if this connection exists
      const connectionExists = connections.some(conn => 
        conn.from === currentId && conn.to === nextId
      );

      if (!connectionExists) {
        return {
          isCorrect: false,
          message: `Missing connection in sequence.`,
          details: `Expected connection from ${currentValue} to ${nextValue}, but it doesn't exist.`
        };
      }
    }

    // Check for extra connections (should only have sequential connections)
    for (const connection of connections) {
      const fromCircle = circles.find(c => c.id === connection.from);
      const toCircle = circles.find(c => c.id === connection.to);
      
      if (!fromCircle || !toCircle) continue;

      const fromValue = parseInt(fromCircle.value);
      const toValue = parseInt(toCircle.value);
      
      const fromIndex = this.expectedSequence.indexOf(fromValue);
      const toIndex = this.expectedSequence.indexOf(toValue);

      // Check if this is a valid sequential connection
      if (toIndex !== fromIndex + 1) {
        return {
          isCorrect: false,
          message: `Invalid connection found.`,
          details: `Connection from ${fromValue} to ${toValue} is not part of the expected sequence.`
        };
      }
    }

    // Validate head and tail nodes
    const headValidation = this.validateHeadNode(circles, connections);
    if (!headValidation.isCorrect) return headValidation;

    const tailValidation = this.validateTailNode(circles, connections);
    if (!tailValidation.isCorrect) return tailValidation;

    return { isCorrect: true };
  }

  // Validate that there's exactly one head node (first value in sequence)
  validateHeadNode(circles, connections) {
    const expectedHeadValue = this.expectedSequence[0];
    const headCircle = circles.find(c => parseInt(c.value) === expectedHeadValue);
    
    if (!headCircle) {
      return {
        isCorrect: false,
        message: `Head node not found.`,
        details: `Expected head node with value ${expectedHeadValue}`
      };
    }

    // Head node should have outgoing connections but no incoming
    const hasOutgoing = connections.some(conn => conn.from === headCircle.id);
    const hasIncoming = connections.some(conn => conn.to === headCircle.id);

    if (!hasOutgoing || hasIncoming) {
      return {
        isCorrect: false,
        message: `Incorrect head node structure.`,
        details: `Head node (${expectedHeadValue}) should have outgoing connections but no incoming connections.`
      };
    }

    return { isCorrect: true };
  }

  // Validate that there's exactly one tail node (last value in sequence)
  validateTailNode(circles, connections) {
    const expectedTailValue = this.expectedSequence[this.expectedSequence.length - 1];
    const tailCircle = circles.find(c => parseInt(c.value) === expectedTailValue);
    
    if (!tailCircle) {
      return {
        isCorrect: false,
        message: `Tail node not found.`,
        details: `Expected tail node with value ${expectedTailValue}`
      };
    }

    // Tail node should have incoming connections but no outgoing
    const hasOutgoing = connections.some(conn => conn.from === tailCircle.id);
    const hasIncoming = connections.some(conn => conn.to === tailCircle.id);

    if (hasOutgoing || !hasIncoming) {
      return {
        isCorrect: false,
        message: `Incorrect tail node structure.`,
        details: `Tail node (${expectedTailValue}) should have incoming connections but no outgoing connections.`
      };
    }

    return { isCorrect: true };
  }

  // Get a detailed analysis of the current state
  getDetailedAnalysis(circles, connections) {
    const analysis = {
      circleCount: circles.length,
      connectionCount: connections.length,
      values: circles.map(c => parseInt(c.value)).sort((a, b) => a - b),
      addresses: circles.map(c => c.address).sort(),
      structure: this.analyzeStructure(circles, connections)
    };

    return analysis;
  }

  // Analyze the current structure
  analyzeStructure(circles, connections) {
    if (circles.length === 0) return "No nodes created";
    if (connections.length === 0) return "No connections made";

    // Find head nodes (no incoming connections)
    const headNodes = circles.filter(circle => 
      !connections.some(conn => conn.to === circle.id)
    );

    // Find tail nodes (no outgoing connections)
    const tailNodes = circles.filter(circle => 
      !connections.some(conn => conn.from === circle.id)
    );

    // Find isolated nodes (no connections at all)
    const isolatedNodes = circles.filter(circle => 
      !connections.some(conn => conn.from === circle.id || conn.to === circle.id)
    );

    let structure = [];
    if (headNodes.length > 0) structure.push(`${headNodes.length} head node(s)`);
    if (tailNodes.length > 0) structure.push(`${tailNodes.length} tail node(s)`);
    if (isolatedNodes.length > 0) structure.push(`${isolatedNodes.length} isolated node(s)`);

    return structure.join(", ") || "Complex structure";
  }
}

// Export predefined test cases
export const TEST_CASES = {
  basic: {
    sequence: [10, 20, 50, 30],
    addresses: {
      10: "a10",
      20: "a30", 
      50: "a50",
      30: "a70"
    },
    title: "Basic Linked List",
    description: "Create a linked list with values [10, 20, 50, 30] and their respective addresses"
  },
  
  simple: {
    sequence: [1, 2, 3],
    addresses: {
      1: "a100",
      2: "a200", 
      3: "a300"
    },
    title: "Simple Sequence",
    description: "Create a simple linked list with values [1, 2, 3]"
  },

  challenge: {
    sequence: [100, 50, 75, 25],
    addresses: {
      100: "a500",
      50: "a600", 
      75: "a700",
      25: "a800"
    },
    title: "Challenge Level",
    description: "Create a linked list with values [100, 50, 75, 25] in the correct order"
  }
};

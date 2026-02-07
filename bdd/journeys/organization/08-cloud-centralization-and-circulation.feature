@journey @organization
Feature: Cloud, Centralization, and Circulation
  As a Deepractice member, I need to understand why cloud and centralization
  enable agent circulation, so I don't fall into the decentralization illusion.

  # ============================================================================
  # The Local vs Cloud Debate
  # ============================================================================

  Scenario: Member understands the local agent trend
    Given local AI agents are trending (e.g. local LLMs, on-device agents)
    Then the appeal of local is clear:
      | advantage            | why it attracts people         |
      | Low cost             | No cloud bills                 |
      | Privacy              | Data stays on device           |
      | Independence         | No vendor lock-in              |
    But local has a fundamental limitation:
      | limitation           | consequence                              |
      | Bound to device      | Agent cannot move to another environment |
      | No network effect    | Agent cannot be discovered by others     |
      | No marketplace       | Agent cannot be traded or shared         |
      | Hardware dependent   | Performance varies across devices        |
    And this contradicts our core mission: agent circulation

  Scenario: Member understands why cloud serves the circulation mission
    Given our mission is to make agents flow freely
    Then cloud is the natural home for circulation:
      | cloud property       | how it serves circulation               |
      | Accessible anywhere  | Any user, any device, any time          |
      | Instant deployment   | Agent goes from creator to user in seconds |
      | Discoverable         | Agents can be found in a marketplace    |
      | Tradeable            | Agents can be monetized and exchanged   |
      | Scalable             | One agent can serve thousands of users  |
    And local can be a development environment — build and test locally
    And cloud is the distribution environment — run and circulate globally

  # ============================================================================
  # The Counterintuitive Truth: Centralization Enables Circulation
  # ============================================================================
  #
  #  Common intuition:
  #    Decentralization = freedom = better circulation
  #
  #  Reality:
  #    Centralized nodes = convenience = actual circulation
  #
  #  Evidence:
  #    Finance  → Market makers (centralized) enable liquidity
  #    Crypto   → Claims decentralization, but Binance (centralized) dominates
  #    Agents   → Local (decentralized) limits flow, cloud (centralized) enables it
  #

  Scenario: Member understands the centralization-circulation paradox
    Given the common belief that decentralization enables free circulation
    Then reality shows the opposite — centralization enables circulation:
      | domain    | decentralized reality              | centralized reality                    |
      | Finance   | No market maker → no liquidity     | Market makers create liquid markets    |
      | Crypto    | Peer-to-peer is slow and fragmented| Binance processes most global volume   |
      | Commerce  | Individual sellers have no reach   | Amazon/Taobao create massive flow      |
      | Agents    | Local agents stay on one device    | Cloud platform enables global reach    |
    And the pattern is consistent: strong central nodes are what make ecosystems flow
    And removing central nodes causes circulation to collapse — recovery takes time

  Scenario: Member understands why centralization brings convenience
    Given circulation requires convenience
    Then centralized platforms provide what decentralized systems cannot:
      | capability              | centralized          | decentralized             |
      | Discovery               | Search and browse    | Must know the exact address |
      | Trust                   | Platform guarantees  | Verify everything yourself  |
      | Transaction             | One-click purchase   | Complex peer-to-peer setup  |
      | Standardization         | Consistent experience| Every node is different     |
      | Onboarding              | Sign up and start    | Install, configure, maintain |
    And convenience is not a luxury — it is a prerequisite for mass circulation
    And without convenience, only technical users participate — the market stays small

  # ============================================================================
  # The Deeper Truth: Centralization Creates Order
  # ============================================================================
  #
  #  Centralization → Order → Structure settles → System stabilizes → Circulation flows
  #

  Scenario: Member understands centralization creates order
    Given centralization is not just about convenience
    Then its deeper value is creating order:
      | chain               | what happens                                      |
      | Centralization      | A stable center provides consistent rules          |
      | → Order             | Rules create predictability and trust               |
      | → Structure settles | Structured resources can accumulate (skills, tools) |
      | → System stabilizes | Participants can rely on the system long-term       |
      | → Circulation flows | Stable systems enable smooth, sustained flow        |
    And without order, there is no structure
    And without structure, resources cannot settle and accumulate (from 04)
    And without accumulated resources, there is nothing to circulate
    And this is why decentralized systems struggle with circulation:
      | decentralized problem       | root cause           |
      | No consistent rules         | No order             |
      | Resources scattered everywhere | No structure       |
      | Every node is different     | No stability         |
      | Users cannot rely on it     | No trust             |

  # ============================================================================
  # Deepractice's Position
  # ============================================================================

  Scenario: Member understands our cloud-first strategy
    Given centralization enables circulation
    And our mission is agent circulation infrastructure
    Then our strategy is:
      | layer        | approach      | purpose                                   |
      | Development  | Local-friendly| Developers build and test on their machines |
      | Distribution | Cloud-first   | Agents circulate through our cloud platform |
      | Runtime      | Cloud-native  | Agents run reliably at scale                |
    And we support local development because it lowers the barrier to create
    And we prioritize cloud distribution because it is the only path to circulation
    And our cloud platform is the centralized node that makes the agent ecosystem flow

  Scenario: Member connects this to the flywheel
    Given our cloud platform is the centralized circulation node
    Then it plays the critical role in the flywheel (from 01):
      | flywheel step                    | cloud's role                          |
      | Open source attracts developers  | Developers build agents locally       |
      | Agents need to reach users       | Cloud platform distributes globally   |
      | Users pay for agent services     | Cloud platform processes transactions |
      | Revenue reinvests in open source | Cycle continues                       |
    And without the centralized cloud node, the flywheel has no monetization layer
    And without monetization, the flywheel stops turning

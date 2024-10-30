import "./App.css";
import React, { useState, useCallback } from "react";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

const App = () => {
  const [data, setData] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState("all");
  const [searchFilter, setSearchFilter] = useState("all");
  const [searchClicked, setSearchClicked] = useState(false);
  const [userFilter, setUserFilter] = useState("");

  const fetchData = useCallback(() => {
    fetch("https://api.jsonbin.io/v3/b/6720f4a9ad19ca34f8c08a77")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((myData) => {
        // Access ladderPricingLists directly from the record
        const ladderPricingLists = myData.record.ladderPricingLists || [];
  
        const filteredData = ladderPricingLists.filter((item) => {
          if (searchFilter === "printed") {
            return item.flag === "P";
          } else if (searchFilter === "not-printed") {
            return item.flag === "NP";
          }
          return true; // For "all"
        });
  
        setData(
          filteredData.map((item) => ({
            ...item,
            showInput: false,
            inputValue: 1,
          }))
        );
  
        setSearchClicked(true);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, [searchFilter, userFilter]);
  
  

  const handleCheckboxChange = (productId) => {
    setData((prevData) =>
      prevData.map((item) =>
        item.productId === productId
          ? { ...item, showInput: !item.showInput }
          : item
      )
    );
  };

  const handleInputChange = (productId, value) => {
    setData((prevData) =>
      prevData.map((item) =>
        item.productId === productId ? { ...item, inputValue: value } : item
      )
    );
  };

  const handleSelectAllChange = () => {
    setSelectAll(!selectAll);
    setData((prevData) =>
      prevData.map((item) => ({ ...item, showInput: !selectAll }))
    );
  };

  const handleFilterChange = (criteria) => {
    setFilterCriteria(criteria);
  };

  const handleClearClick = () => {
    setFilterCriteria("all");
    setSearchFilter("all");
    setSearchClicked(false);
    setUserFilter("");
    setSelectAll(false);

    // Clear selections in the data array
    setData((prevData) =>
      prevData.map((item) => ({ ...item, showInput: false, inputValue: 1 }))
    );
  };

  const generatePDF = () => {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const selectedItems = data.filter((item) => item.showInput);
    // Check if at least one input field has a non-empty value
    const hasNonEmptyInput = selectedItems.some(
      (item) => item.inputValue !== "" && !isNaN(item.inputValue)
    );

    if (!hasNonEmptyInput) {
      alert("Please enter a quantity in at least one input field.");
      return;
    }

    const itemsPerRow = 2;
    const rowsPerPage = 5;
    const itemsPerPage = itemsPerRow * rowsPerPage;
    const boxWidth = 140;
    const boxHeight = 35;
    const spacingX = 5;
    const spacingY = -5;

    let currentPage = 1;
    let yOffset = 5;
    let xOffset = 5;
    let totalItemsPrinted = 0;

    selectedItems.forEach((item) => {
      const quantity = parseInt(item.inputValue, 10);

      for (let i = 0; i < quantity; i++) {
        if (totalItemsPrinted > 0 && totalItemsPrinted % itemsPerPage === 0) {
          pdf.addPage({
            orientation: "landscape",
            unit: "mm",
            format: "a4",
          });
          currentPage++;
          yOffset = 10;
          xOffset = 10;
        }

        const maxDescLength = 22;
        const truncatedDesc =
          item.productDesc && item.productDesc.length > maxDescLength
            ? item.productDesc.substring(0, maxDescLength)
            : item.productDesc || "";

        const remainingDesc =
          item.productDesc && item.productDesc.length > maxDescLength
            ? item.productDesc.substring(maxDescLength)
            : item.productDesc || "";

        // Create a canvas element to draw the barcode
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, `${item.productDesc}-${i + 1}`, {
          format: "CODE128",
          displayValue: false,
        });

        // Convert the canvas to base64
        const barcodeDataURL = canvas.toDataURL("image/png");

        // Add the barcode image to the PDF
        pdf.addImage(barcodeDataURL, "PNG", xOffset + 5, yOffset + 21, 20, 5);

        pdf.rect(xOffset, yOffset, boxWidth, boxHeight);
        pdf.line(xOffset, yOffset + 19, xOffset + boxWidth, yOffset + 19);
        pdf.line(xOffset, yOffset + 27, xOffset + 29, yOffset + 27);
        pdf.line(xOffset + 29, yOffset + 19, xOffset + 29, yOffset + 35);

        // Set a specific font size for this text block
        pdf.setFontSize(15);

        // Render the previous text with the default font size
        pdf.text(
          `${truncatedDesc}                        MRP:${item.mrp}


                 BUY                   1                      ${
                   item.minQty || ""
                 }
                 PRICE          ${item.mrp || ""}             ${
            item.rrp || ""
          } `,
          xOffset + 5,
          yOffset + 7
        );

        // Set a smaller font size for ${item.productId}
        pdf.setFontSize(10);

        // Render ${item.productId} in the smaller font size
        pdf.text(`${item.productId}`, xOffset + 3, yOffset + 32);

        // Reset font size to the previous value
        pdf.setFontSize(15);

        if (remainingDesc) {
          yOffset += 5;
          pdf.text(remainingDesc, xOffset + 5, yOffset + 10);
        }

        xOffset += boxWidth + spacingX;
        totalItemsPrinted++;

        if (totalItemsPrinted % itemsPerRow === 0) {
          yOffset += boxHeight + spacingY;
          xOffset = 5;
        }
      }
    });

    pdf.save(`output_page${currentPage}.pdf`);
  };

  const resetSearch = () => {
    setSearchClicked(false);
  };

  const handleUserFilterChange = (e) => {
    setUserFilter(e.target.value);
  };

  const handleSearchClick = () => {
    setSearchFilter(filterCriteria);
    setSearchClicked(false);
    fetchData(); // Trigger the fetchData function on search click
  };

  return (
    <div className="table-container">
      <div>
        <div id="a1">
          <span id="a2">Metro</span> SEL Printing
        </div>
        <div id="a3">
          <select id="a6">
            <optgroup>
              <option value="item 1">Category</option>
              <option value="item 2">item 1</option>
              <option value="item 3">item 2</option>
              <option value="item 4">item 3</option>
            </optgroup>
          </select>
          <span id="a7" colSpan="3">
            <input
              type="Number"
              placeholder="Filter by id..."
              value={userFilter}
              onChange={handleUserFilterChange}
            />{" "}
          </span>
          <label>
            Print Criteria
            <select
              value={filterCriteria}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <option value="all">Select</option>
              <option value="printed">Printed</option>
              <option value="not-printed">Not Printed</option>
            </select>
          </label>
          <button id="a4" onClick={handleSearchClick}>
            Search
          </button>
          <button id="a4" onClick={handleClearClick}>
            Clear
          </button>

          <button id="a5" onClick={generatePDF}>
            Generate Pdf
          </button>
        </div>
        <table id="a9" key="">
          <thead>
            <tr>
              <th>Product ID</th>
              <th >Product Name</th>
              <th>
               SelectAll
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAllChange}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((val) => (
              <tr key={val.productId}>
                <td>{val.productId}</td>
                <td>{val.productName}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={val.showInput}
                    onChange={() => handleCheckboxChange(val.productId)}
                  />
                  {val.showInput && (
                    <>
                      <input
                        type="number"
                        value={val.inputValue}
                        onChange={(e) =>
                          handleInputChange(val.productId, e.target.value)
                        }
                      />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;

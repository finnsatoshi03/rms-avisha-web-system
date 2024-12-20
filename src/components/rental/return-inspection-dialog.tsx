/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Printer, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface ReturnInspectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    checklistItems: any;
    notes: any;
    meterReading: string;
    timestamp: string;
  }) => void;
}

const ReturnInspectionDialog: React.FC<ReturnInspectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [checklistItems, setChecklistItems] = useState({
    physicalCondition: false,
    printQuality: false,
    meterReading: false,
    accessories: false,
  });

  const [notes, setNotes] = useState({
    physicalCondition: "",
    printQuality: "",
    meterReading: "",
    accessories: "",
  });

  const [meterReading, setMeterReading] = useState("");

  const allChecked = Object.values(checklistItems).every((item) => item);

  const handleConfirm = () => {
    onConfirm({
      checklistItems,
      notes,
      meterReading,
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Return Inspection Checklist
          </DialogTitle>
          <DialogDescription>
            Complete the inspection checklist before changing the unit status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Physical Condition */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="physicalCondition"
                checked={checklistItems.physicalCondition}
                onCheckedChange={(checked) =>
                  setChecklistItems((prev) => ({
                    ...prev,
                    physicalCondition: checked === true,
                  }))
                }
              />
              <Label htmlFor="physicalCondition" className="font-medium">
                Physical Condition Check
              </Label>
            </div>
            <Textarea
              placeholder="Enter condition notes..."
              className="h-16"
              value={notes.physicalCondition}
              onChange={(e) =>
                setNotes((prev) => ({
                  ...prev,
                  physicalCondition: e.target.value,
                }))
              }
            />
          </div>

          {/* Print Quality */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="printQuality"
                checked={checklistItems.printQuality}
                onCheckedChange={(checked) =>
                  setChecklistItems((prev) => ({
                    ...prev,
                    printQuality: checked === true,
                  }))
                }
              />
              <Label htmlFor="printQuality" className="font-medium">
                Print Quality Assessment
              </Label>
            </div>
            <Textarea
              placeholder="Enter print quality notes..."
              className="h-16"
              value={notes.printQuality}
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, printQuality: e.target.value }))
              }
            />
          </div>

          {/* Meter Reading */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="meterReading"
                checked={checklistItems.meterReading}
                onCheckedChange={(checked) =>
                  setChecklistItems((prev) => ({
                    ...prev,
                    meterReading: checked === true,
                  }))
                }
              />
              <Label htmlFor="meterReading" className="font-medium">
                Meter Reading Verification
              </Label>
            </div>
            <Input
              type="number"
              placeholder="Enter meter reading"
              value={meterReading}
              onChange={(e) => setMeterReading(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Accessories */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accessories"
                checked={checklistItems.accessories}
                onCheckedChange={(checked) =>
                  setChecklistItems((prev) => ({
                    ...prev,
                    accessories: checked === true,
                  }))
                }
              />
              <Label htmlFor="accessories" className="font-medium">
                Accessory Inventory Check
              </Label>
            </div>
            <Textarea
              placeholder="List any missing or damaged accessories..."
              className="h-16"
              value={notes.accessories}
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, accessories: e.target.value }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {allChecked ? (
                <CheckCircle2 className="text-green-500 w-5 h-5" />
              ) : (
                <AlertCircle className="text-yellow-500 w-5 h-5" />
              )}
              <span
                className={`text-sm ${
                  allChecked ? "text-green-500" : "text-yellow-500"
                }`}
              >
                {allChecked ? "All items checked" : "Complete all items"}
              </span>
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!allChecked || !meterReading}
                className="bg-primaryRed hover:bg-hoveredRed"
              >
                Confirm Return
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnInspectionDialog;
